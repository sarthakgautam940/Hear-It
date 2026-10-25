import type { ChatterGain, ChatterLevel, Frame } from "./types";
import { leq } from "./dsp/level";

export interface ControllerConfig {
  k: number;
  stepClampDb: number;
  deadbandDb: number;
  minGainDb: number;
  maxGainDb: number;
  targetDb: number;
}

export const MIN_GAIN_DB = -24;
export const MAX_GAIN_DB = 0;
export const LEVEL_STEP_DB = 6;
/** Loudness compensation takes about 157 ms (Bauer 2006); frames before it are not the reflex. */
export const REFLEX_LATENCY_MS = 150;
export const MIN_UTTERANCE_MS = 800;
export const MIN_GATE_SHARE = 0.7;

export const DEFAULT_CONTROLLER: Omit<ControllerConfig, "targetDb"> = {
  // Stable for every published Lombard slope: the error obeys e' = (1 - s k) e,
  // which converges when 0 < s k < 2, and s runs from 0.27 to about 1.
  k: 1,
  stepClampDb: 3,
  deadbandDb: 1.5,
  minGainDb: MIN_GAIN_DB,
  maxGainDb: MAX_GAIN_DB,
};

/** Manual levels: 0 is off; 1 to 5 are -24, -18, -12, -6 and 0 dB below the cap. */
export function levelToGain(level: ChatterLevel): ChatterGain {
  return level === 0 ? "off" : MIN_GAIN_DB + (level - 1) * LEVEL_STEP_DB;
}

export function gainToLevel(gain: ChatterGain): ChatterLevel {
  if (gain === "off") return 0;
  const step = Math.round((gain - MIN_GAIN_DB) / LEVEL_STEP_DB) + 1;
  return Math.max(1, Math.min(5, step)) as ChatterLevel;
}

/**
 * The energy-mean A-weighted level of an utterance, from the frames after the
 * reflex latency, excluding clipped frames. Null when the utterance is too short
 * or the gate was not open for most of it, so the controller never learns from
 * a sentence the chatter barely touched.
 */
export function utteranceLeq(
  frames: readonly Frame[],
  gateOpen: readonly boolean[],
  requireGate: boolean,
  frameMs = 20,
  excludeMs = REFLEX_LATENCY_MS,
): number | null {
  if (frames.length * frameMs < MIN_UTTERANCE_MS) return null;
  if (requireGate) {
    const share = gateOpen.filter(Boolean).length / Math.max(1, gateOpen.length);
    if (share < MIN_GATE_SHARE) return null;
  }
  const skip = Math.round(excludeMs / frameMs);
  const levels: number[] = [];
  for (let i = skip; i < frames.length; i++) {
    const f = frames[i];
    if (f && !f.clipped) levels.push(f.levelADb);
  }
  return leq(levels);
}

/**
 * One integral step after an utterance. From off, an error above the dead-band
 * enters at the lowest level; from the lowest level, an error below the
 * negative dead-band turns the chatter off. The least noise that works,
 * including none.
 */
export function controllerStep(
  gain: ChatterGain,
  leqDb: number,
  cfg: ControllerConfig,
): ChatterGain {
  const e = cfg.targetDb - leqDb;
  if (Math.abs(e) <= cfg.deadbandDb) return gain;
  if (gain === "off") return e > 0 ? cfg.minGainDb : "off";
  if (e < 0 && gain <= cfg.minGainDb) return "off";
  const step = Math.max(-cfg.stepClampDb, Math.min(cfg.stepClampDb, cfg.k * e));
  return Math.max(cfg.minGainDb, Math.min(cfg.maxGainDb, gain + step));
}

/**
 * Utterances until the loop settles, for a speaker whose voice rises `slope` dB
 * per dB of chatter above the onset level. A model of the published reflex,
 * not a measurement; the self-test and the validation table are the measurement.
 */
export function utterancesToSettle(
  slope: number,
  initialErrorDb: number,
  cfg: ControllerConfig,
  maxUtterances = 50,
): number {
  let gain: ChatterGain = cfg.minGainDb;
  const baseline = cfg.targetDb - initialErrorDb;
  const voiceAt = (g: ChatterGain) =>
    baseline + slope * ((g === "off" ? cfg.minGainDb : g) - cfg.minGainDb);
  for (let n = 1; n <= maxUtterances; n++) {
    gain = controllerStep(gain, voiceAt(gain), cfg);
    if (Math.abs(cfg.targetDb - voiceAt(gain)) <= cfg.deadbandDb) return n;
  }
  return maxUtterances;
}
