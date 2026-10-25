import type { EarMode, Frame } from "@/core/types";
import { dbToLinear } from "@/core/dsp/level";

export const LEVEL_PROCESSOR_NAME = "hearit-level";
const WORKLET_URL = "/audio/level-processor.js";

export interface Capabilities {
  /** Whether the browser honored the request to leave the signal unprocessed. */
  rawAudio: boolean;
  audioSession: boolean;
  sampleRate: number;
  echoCancellation: boolean | null;
  noiseSuppression: boolean | null;
  autoGainControl: boolean | null;
}

export interface Microphone {
  stream: MediaStream;
  ctx: AudioContext;
  caps: Capabilities;
}

interface AudioSessionLike {
  type: string;
}

/**
 * Opens the microphone with every processing stage off: automatic gain would
 * flatten the meter this app exists to read, and echo cancellation is the
 * setting under which recent iOS builds crackle while playing into earbuds.
 */
export async function openMicrophone(): Promise<Microphone> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneError(
      "unsupported",
      "This browser cannot open the microphone from a web page.",
    );
  }
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  const audioSession = Boolean(session);
  if (session) session.type = "play-and-record";

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });
  } catch (err) {
    throw MicrophoneError.fromGetUserMedia(err);
  }

  const track = stream.getAudioTracks()[0];
  const settings = track?.getSettings() ?? {};
  const ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const caps: Capabilities = {
    rawAudio:
      settings.echoCancellation === false &&
      settings.noiseSuppression === false &&
      settings.autoGainControl === false,
    audioSession,
    sampleRate: ctx.sampleRate,
    echoCancellation: settings.echoCancellation ?? null,
    noiseSuppression: settings.noiseSuppression ?? null,
    autoGainControl: settings.autoGainControl ?? null,
  };
  return { stream, ctx, caps };
}

export type MicrophoneFailure = "denied" | "busy" | "unsupported" | "unknown";

export class MicrophoneError extends Error {
  constructor(
    readonly kind: MicrophoneFailure,
    message: string,
  ) {
    super(message);
    this.name = "MicrophoneError";
  }

  static fromGetUserMedia(err: unknown): MicrophoneError {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return new MicrophoneError("denied", "The microphone was not allowed.");
    }
    if (name === "NotReadableError" || name === "AbortError") {
      return new MicrophoneError("busy", "Another app is using the microphone.");
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return new MicrophoneError("unsupported", "No microphone was found.");
    }
    return new MicrophoneError(
      "unknown",
      err instanceof Error ? err.message : "The microphone could not be opened.",
    );
  }
}

export interface Graph {
  setLevel(gainDb: number | "off", rampMs: number): void;
  setGate(open: boolean, rampMs: number): void;
  setEar(ear: EarMode): void;
  close(): void;
}

/**
 * Wires the microphone into the level processor and the babble into one ear.
 * Two gain stages: the level the controller chooses, and the gate the voice
 * detector opens and closes, so each can be ramped on its own clock.
 */
export async function wireGraph(
  mic: Microphone,
  babble: AudioBuffer,
  onFrame: (frame: Frame) => void,
): Promise<Graph> {
  const { ctx, stream } = mic;
  await ctx.audioWorklet.addModule(WORKLET_URL);

  const source = ctx.createMediaStreamSource(stream);
  const meter = new AudioWorkletNode(ctx, LEVEL_PROCESSOR_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1,
  });
  meter.port.onmessage = (event: MessageEvent<Frame>) => onFrame(event.data);
  source.connect(meter);

  const player = ctx.createBufferSource();
  player.buffer = babble;
  player.loop = true;
  const levelGain = ctx.createGain();
  const gateGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  levelGain.gain.value = 0;
  gateGain.gain.value = 0;
  player.connect(levelGain).connect(gateGain).connect(panner).connect(ctx.destination);
  player.start();

  const ramp = (param: AudioParam, target: number, ms: number) => {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + ms / 1000);
  };

  return {
    setLevel(gainDb, rampMs) {
      ramp(levelGain.gain, gainDb === "off" ? 0 : dbToLinear(gainDb), rampMs);
    },
    setGate(open, rampMs) {
      ramp(gateGain.gain, open ? 1 : 0, rampMs);
    },
    setEar(ear) {
      // A full pan puts the whole signal in one channel; the center splits it
      // at equal power, which the controller absorbs like any other level.
      panner.pan.value = ear === "left" ? -1 : ear === "right" ? 1 : 0;
    },
    close() {
      meter.port.onmessage = null;
      try {
        player.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
      meter.disconnect();
      player.disconnect();
      panner.disconnect();
      for (const track of stream.getTracks()) track.stop();
      void ctx.close();
    },
  };
}
