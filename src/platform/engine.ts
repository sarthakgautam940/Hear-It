import { utteranceClarity } from "@/core/clarity";
import {
  controllerStep,
  DEFAULT_CONTROLLER,
  levelToGain,
  utteranceLeq,
  type ControllerConfig,
} from "@/core/controller";
import { leq, makeLevelSmoother } from "@/core/dsp/level";
import { modulationRatio } from "@/core/dsp/modulation";
import { dosePercent, estimatedEarLevelDba } from "@/core/exposure";
import { createGate, gateIsOpen, type GateState } from "@/core/gate";
import { inReach, reachAll, reachFactor } from "@/core/reach";
import { classifyNoise } from "@/core/room";
import { createSession } from "@/core/session";
import type {
  Calibration,
  ChatterGain,
  Frame,
  Hearing,
  Listener,
  NoiseKind,
  Room,
  SelfTestResult,
  Session,
  Settings,
} from "@/core/types";
import { createVad, DEFAULT_VAD, FRAME_MS, sensitivityMargin } from "@/core/vad";
import {
  MicrophoneError,
  openMicrophone,
  wireGraph,
  type Capabilities,
  type Graph,
  type Microphone,
} from "./audio";
import { loadBabble, type BabbleSource } from "./babble";
import {
  DEFAULT_CALIBRATION,
  DEFAULT_ROOM,
  DEFAULT_SETTINGS,
  newId,
  rememberSession,
} from "./storage";
import { keepScreenAwake } from "./wakelock";

export type EnginePhase = "idle" | "starting" | "live" | "error";
export type EngineMode = "table" | "selftest" | "room";
export type LiveStatus = "off" | "starting" | "listening" | "boosting" | "not-needed" | "paused";

export interface EngineInputs {
  settings: Settings;
  calibration: Calibration;
  listeners: Listener[];
  room: Room;
  selfTest: SelfTestResult | null;
}

export interface EngineSnapshot {
  phase: EnginePhase;
  mode: EngineMode | null;
  error: string | null;
  errorKind: MicrophoneError["kind"] | null;
  status: LiveStatus;
  speaking: boolean;
  gateOpen: boolean;
  chatterGainDb: ChatterGain;
  chatterAudible: boolean;
  levelDba: number | null;
  l1Dba: number | null;
  noiseDba: number | null;
  reach: Record<Hearing, number> | null;
  previewReach: Record<Hearing, number> | null;
  inReach: string[];
  utteranceCount: number;
  speechSeconds: number;
  chatterSeconds: number;
  dosePercent: number;
  rippleAt: number;
  estimated: boolean;
  babbleSource: BabbleSource | null;
  caps: Capabilities | null;
  roomProgress: number | null;
}

export interface UtteranceEvent {
  leqDbfs: number | null;
  levelDba: number | null;
  f0s: number[];
  durationMs: number;
  chatterOn: boolean;
  clarityDb: number | null;
}

export interface RoomMeasurement {
  laeqDba: number;
  modulation: number;
  kind: NoiseKind;
}

const EMIT_EVERY_MS = 80;
const LEVEL_RAMP_MS = 50;
const INITIAL: EngineSnapshot = {
  phase: "idle",
  mode: null,
  error: null,
  errorKind: null,
  status: "off",
  speaking: false,
  gateOpen: false,
  chatterGainDb: "off",
  chatterAudible: false,
  levelDba: null,
  l1Dba: null,
  noiseDba: null,
  reach: null,
  previewReach: null,
  inReach: [],
  utteranceCount: 0,
  speechSeconds: 0,
  chatterSeconds: 0,
  dosePercent: 0,
  rippleAt: 0,
  estimated: true,
  babbleSource: null,
  caps: null,
  roomProgress: null,
};

interface OpenUtterance {
  startMs: number;
  frames: Frame[];
  gateOpen: boolean[];
  f0s: number[];
}

interface RoomCapture {
  levels: number[];
  needed: number;
  resolve: (m: RoomMeasurement) => void;
}

/**
 * The live loop. Frames arrive from the worklet; the voice detector decides
 * whether the user is speaking; the gate opens the chatter only then; after
 * each sentence the controller moves the chatter to the least level that holds
 * the target; the reach model turns the measured levels into meters. One
 * instance per page, subscribed to from React through a snapshot.
 */
class Engine {
  private snap: EngineSnapshot = INITIAL;
  /** What React reads; its identity changes only when listeners are told, so renders follow emits. */
  private published: EngineSnapshot = INITIAL;
  private readonly listeners = new Set<() => void>();
  private readonly utteranceListeners = new Set<(u: UtteranceEvent) => void>();
  private inputs: EngineInputs = {
    settings: DEFAULT_SETTINGS,
    calibration: DEFAULT_CALIBRATION,
    listeners: [],
    room: DEFAULT_ROOM,
    selfTest: null,
  };

  private mic: Microphone | null = null;
  private graph: Graph | null = null;
  private releaseWake: (() => void) | null = null;
  private vad = this.makeVad();
  private gate = createGate();
  private gateState: GateState = "idle";
  private gain: ChatterGain = "off";
  private forcedChatter: boolean | null = null;
  private utterance: OpenUtterance | null = null;
  private session: Session | null = null;
  private smoother = makeLevelSmoother(125, FRAME_MS);
  private lastEmit = 0;
  private lastL1Dbfs: number | null = null;
  private floorDbfs: number | null = null;
  private roomCapture: RoomCapture | null = null;
  private paused = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EngineSnapshot => this.published;

  onUtterance(listener: (u: UtteranceEvent) => void): () => void {
    this.utteranceListeners.add(listener);
    return () => this.utteranceListeners.delete(listener);
  }

  /** Called whenever a store changes; applies what can change while live. */
  configure(inputs: EngineInputs): void {
    const prev = this.inputs;
    this.inputs = inputs;
    if (this.snap.phase === "live") {
      if (
        prev.settings.sensitivity !== inputs.settings.sensitivity ||
        prev.selfTest !== inputs.selfTest
      ) {
        this.vad = this.makeVad();
      }
      if (prev.settings.ear !== inputs.settings.ear) this.graph?.setEar(inputs.settings.ear);
      if (
        this.snap.mode === "table" &&
        (!inputs.settings.adaptive || prev.settings.chatterLevel !== inputs.settings.chatterLevel)
      ) {
        this.setGain(levelToGain(inputs.settings.chatterLevel));
      }
    }
    this.recompute(true);
  }

  async start(mode: EngineMode): Promise<void> {
    if (this.snap.phase === "live" || this.snap.phase === "starting") {
      this.setMode(mode);
      return;
    }
    this.patch({ phase: "starting", mode, error: null, errorKind: null, status: "starting" }, true);
    try {
      const mic = await openMicrophone();
      const babble = await loadBabble(mic.ctx);
      const graph = await wireGraph(mic, babble.buffer, (frame) => this.onFrame(frame));
      this.mic = mic;
      this.graph = graph;
      mic.ctx.addEventListener("statechange", this.onContextState);
      document.addEventListener("visibilitychange", this.onVisibility);
      graph.setEar(this.inputs.settings.ear);
      this.resetLoop();
      this.setMode(mode);
      if (mode === "table") this.releaseWake = await keepScreenAwake();
      this.patch(
        {
          phase: "live",
          status: "listening",
          babbleSource: babble.source,
          caps: mic.caps,
          estimated: this.inputs.calibration.measuredAt === null,
        },
        true,
      );
    } catch (err) {
      const kind = err instanceof MicrophoneError ? err.kind : "unknown";
      const message = err instanceof Error ? err.message : "The microphone could not be opened.";
      await this.teardown();
      this.patch({ ...INITIAL, phase: "error", error: message, errorKind: kind }, true);
    }
  }

  async stop(): Promise<void> {
    if (this.snap.phase === "idle") return;
    this.finishUtterance();
    this.closeSession();
    await this.teardown();
    this.patch({ ...INITIAL }, true);
  }

  setMode(mode: EngineMode): void {
    if (this.snap.mode === mode && this.snap.phase === "live") return;
    this.finishUtterance();
    this.closeSession();
    this.forcedChatter = null;
    this.roomCapture = null;
    if (mode === "table") {
      this.session = createSession(
        newId(),
        new Date().toISOString(),
        this.inputs.listeners.map((l) => l.id),
      );
      this.setGain(levelToGain(this.inputs.settings.chatterLevel));
    } else {
      this.setGain("off");
    }
    this.patch(
      {
        mode,
        utteranceCount: 0,
        speechSeconds: 0,
        chatterSeconds: 0,
        dosePercent: 0,
        roomProgress: null,
      },
      true,
    );
  }

  /** Self-test: force the chatter on or off for the next sentence; null returns to normal. */
  setForcedChatter(boosted: boolean | null): void {
    this.forcedChatter = boosted;
    if (boosted === null) return;
    const level = this.inputs.settings.chatterLevel === 0 ? 3 : this.inputs.settings.chatterLevel;
    this.setGain(boosted ? levelToGain(level) : "off");
  }

  /** Ten seconds of the room, with nobody speaking. Requires the room mode to be live. */
  measureRoom(seconds: number): Promise<RoomMeasurement> {
    return new Promise((resolve) => {
      this.roomCapture = { levels: [], needed: Math.round((seconds * 1000) / FRAME_MS), resolve };
      this.patch({ roomProgress: 0 }, true);
    });
  }

  private makeVad() {
    const { settings, selfTest } = this.inputs;
    return createVad({
      ...DEFAULT_VAD,
      marginDb: sensitivityMargin(settings.sensitivity),
      baselineDb: selfTest?.baselineDb ?? null,
      f0Range: selfTest?.f0Range ?? null,
    });
  }

  private resetLoop(): void {
    this.vad = this.makeVad();
    this.gate = createGate();
    this.gateState = "idle";
    this.utterance = null;
    this.smoother = makeLevelSmoother(125, FRAME_MS);
    this.lastL1Dbfs = null;
    this.floorDbfs = null;
    this.paused = false;
  }

  /** A table session with any sentence in it is kept, whether Stop or a mode change ended it. */
  private closeSession(): void {
    const session = this.session;
    this.session = null;
    if (!session) return;
    session.endedAt = new Date().toISOString();
    session.noiseDba = this.currentNoiseDba();
    if (session.utterances.length > 0) rememberSession(session);
  }

  private setGain(gain: ChatterGain): void {
    this.gain = gain;
    this.graph?.setLevel(gain, LEVEL_RAMP_MS);
    this.recompute(true);
  }

  private controllerConfig(): ControllerConfig | null {
    const baseline = this.inputs.selfTest?.baselineDb;
    if (baseline === undefined || baseline === null) return null;
    return { ...DEFAULT_CONTROLLER, targetDb: baseline + this.inputs.settings.targetGainDb };
  }

  private onFrame(frame: Frame): void {
    if (this.snap.phase !== "live") return;
    const mode = this.snap.mode;

    if (mode === "room") {
      this.captureRoom(frame);
      this.recompute(false);
      return;
    }

    const vad = this.vad.step(frame);
    this.floorDbfs = Number.isFinite(vad.floorDb) ? vad.floorDb : this.floorDbfs;
    const gateAllowed = this.gain !== "off" && (this.forcedChatter ?? true);
    const { state, ramp } = this.gate.step(vad.speaking, frame.tMs);
    this.gateState = state;
    if (ramp) this.graph?.setGate(ramp.to === 1 && gateAllowed, ramp.durationMs);
    const audible = gateIsOpen(state) && gateAllowed;

    if (vad.speaking) {
      if (!this.utterance) {
        this.utterance = { startMs: frame.tMs, frames: [], gateOpen: [], f0s: [] };
        this.patch({ rippleAt: performance.now() }, true);
      }
      this.utterance.frames.push(frame);
      this.utterance.gateOpen.push(audible);
      if (frame.f0Hz !== null) this.utterance.f0s.push(frame.f0Hz);
      if (this.session) this.session.speechSeconds += FRAME_MS / 1000;
    } else if (this.utterance) {
      this.finishUtterance();
    }

    if (audible && this.session) {
      const ear = estimatedEarLevelDba(this.gain === "off" ? -120 : this.gain);
      this.session.chatterSeconds += FRAME_MS / 1000;
      this.session.dosePercent += dosePercent(FRAME_MS / 1000, ear);
    }

    const smoothed = this.smoother(frame.levelADb);
    if (this.utterance && this.utterance.frames.length >= 15) {
      this.lastL1Dbfs = leq(this.utterance.frames.slice(7).map((f) => f.levelADb));
    }
    this.snap = {
      ...this.snap,
      speaking: vad.speaking,
      gateOpen: gateIsOpen(state),
      chatterAudible: audible,
    };
    this.snap.levelDba = smoothed + this.inputs.calibration.offsetDb;
    this.recompute(false);
  }

  private finishUtterance(): void {
    const u = this.utterance;
    this.utterance = null;
    if (!u) return;
    const mode = this.snap.mode;
    const openShare = u.gateOpen.filter(Boolean).length / Math.max(1, u.gateOpen.length);
    const chatterOn = this.gain !== "off" && openShare >= 0.7;
    const strict = utteranceLeq(u.frames, u.gateOpen, chatterOn);
    const loose = utteranceLeq(u.frames, u.gateOpen, false);
    const leqDbfs = mode === "selftest" ? loose : strict;
    const offset = this.inputs.calibration.offsetDb;
    const clarity = utteranceClarity(u.frames);
    const durationMs = u.frames.length * FRAME_MS;

    if (leqDbfs !== null) this.lastL1Dbfs = leqDbfs;

    if (mode === "table" && this.session && leqDbfs !== null) {
      const levelDba = leqDbfs + offset;
      const reach = this.currentReach(levelDba);
      this.session.utterances.push({
        startMs: u.startMs,
        endMs: u.startMs + durationMs,
        levelDba,
        chatterOn,
        chatterGainDb: this.gain === "off" ? null : this.gain,
        clarityDb: clarity,
        inReach: reach ? inReach(this.inputs.listeners, reach) : [],
      });
      const cfg = this.controllerConfig();
      if (this.inputs.settings.adaptive && cfg && (chatterOn || this.gain === "off")) {
        const next = controllerStep(this.gain, leqDbfs, cfg);
        if (next !== this.gain) this.setGain(next);
      }
    }

    const event: UtteranceEvent = {
      leqDbfs,
      levelDba: leqDbfs === null ? null : leqDbfs + offset,
      f0s: u.f0s,
      durationMs,
      chatterOn,
      clarityDb: clarity,
    };
    for (const l of this.utteranceListeners) l(event);
    this.recompute(true);
  }

  private captureRoom(frame: Frame): void {
    const capture = this.roomCapture;
    if (!capture) return;
    capture.levels.push(frame.levelADb);
    const progress = Math.min(1, capture.levels.length / capture.needed);
    this.snap = {
      ...this.snap,
      roomProgress: progress,
      levelDba: frame.levelADb + this.inputs.calibration.offsetDb,
    };
    if (capture.levels.length < capture.needed) return;
    this.roomCapture = null;
    const laeq = leq(capture.levels) ?? -120;
    const windows: number[] = [];
    for (let i = 0; i + 50 <= capture.levels.length; i += 50) {
      windows.push(modulationRatio(capture.levels.slice(i, i + 50), 1000 / FRAME_MS));
    }
    const modulation = windows.length ? windows.reduce((a, b) => a + b, 0) / windows.length : 0;
    const laeqDba = laeq + this.inputs.calibration.offsetDb;
    this.snap = { ...this.snap, roomProgress: null };
    capture.resolve({ laeqDba, modulation, kind: classifyNoise(laeqDba, modulation) });
  }

  private currentReach(l1Dba: number): Record<Hearing, number> | null {
    const noise = this.currentNoiseDba();
    if (noise === null) return null;
    const { room } = this.inputs;
    return reachAll(l1Dba, noise, room.alphaDbPerDoubling, room.kind ?? "voices");
  }

  private currentNoiseDba(): number | null {
    if (this.floorDbfs !== null) return this.floorDbfs + this.inputs.calibration.offsetDb;
    return this.inputs.room.noiseDba;
  }

  private recompute(force: boolean): void {
    const offset = this.inputs.calibration.offsetDb;
    const l1 = this.lastL1Dbfs === null ? null : this.lastL1Dbfs + offset;
    const noise = this.currentNoiseDba();
    const reach = l1 === null ? null : this.currentReach(l1);
    const gainDb = this.inputs.selfTest?.gainDb ?? 0;
    const chatterOff = this.gain === "off" || this.forcedChatter === false;
    const previewReach =
      reach && chatterOff && gainDb > 0
        ? {
            well: reach.well * reachFactor(gainDb, this.inputs.room.alphaDbPerDoubling),
            some: reach.some * reachFactor(gainDb, this.inputs.room.alphaDbPerDoubling),
            alot: reach.alot * reachFactor(gainDb, this.inputs.room.alphaDbPerDoubling),
          }
        : null;
    const live = this.snap.phase === "live";
    const adaptive = this.inputs.settings.adaptive && this.controllerConfig() !== null;
    const status: LiveStatus = !live
      ? this.snap.phase === "starting"
        ? "starting"
        : "off"
      : this.paused
        ? "paused"
        : this.snap.chatterAudible
          ? "boosting"
          : adaptive && this.gain === "off" && this.snap.mode === "table"
            ? "not-needed"
            : "listening";

    this.snap = {
      ...this.snap,
      status,
      chatterGainDb: this.gain,
      l1Dba: l1,
      noiseDba: noise,
      reach,
      previewReach,
      inReach: reach ? inReach(this.inputs.listeners, reach) : [],
      utteranceCount: this.session?.utterances.length ?? 0,
      speechSeconds: this.session?.speechSeconds ?? 0,
      chatterSeconds: this.session?.chatterSeconds ?? 0,
      dosePercent: this.session?.dosePercent ?? 0,
      estimated: this.inputs.calibration.measuredAt === null,
    };
    this.emit(force);
  }

  private patch(partial: Partial<EngineSnapshot>, force: boolean): void {
    this.snap = { ...this.snap, ...partial };
    this.emit(force);
  }

  private emit(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastEmit < EMIT_EVERY_MS) return;
    this.lastEmit = now;
    this.published = this.snap;
    for (const l of this.listeners) l();
  }

  private onContextState = (): void => {
    const state = this.mic?.ctx.state as string | undefined;
    this.paused = state === "interrupted" || state === "suspended";
    this.recompute(true);
  };

  private onVisibility = (): void => {
    if (document.visibilityState === "visible" && this.mic && this.mic.ctx.state !== "running") {
      void this.mic.ctx.resume();
    }
  };

  private async teardown(): Promise<void> {
    this.mic?.ctx.removeEventListener("statechange", this.onContextState);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.graph?.close();
    this.graph = null;
    this.mic = null;
    this.releaseWake?.();
    this.releaseWake = null;
    this.session = null;
    this.utterance = null;
    this.roomCapture = null;
    this.forcedChatter = null;
    this.gain = "off";
  }
}

export const engine = new Engine();
