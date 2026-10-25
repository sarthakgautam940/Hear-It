import type { F0Range, Frame, Sensitivity } from "./types";

export interface VadConfig {
  marginDb: number;
  openFrames: number;
  closeFrames: number;
  closeHysteresisDb: number;
  floorRiseDbPerFrame: number;
  floorSeedFrames: number;
  baselineDb: number | null;
  f0Range: F0Range | null;
  f0SlackSemitones: number;
}

export interface VadState {
  speaking: boolean;
  floorDb: number;
  thresholdDb: number;
}

export const FRAME_MS = 20;

/** Onset margins above the floor for the three sensitivity settings. */
export function sensitivityMargin(s: Sensitivity): number {
  return s === "low" ? 12 : s === "high" ? 8 : 10;
}

export const DEFAULT_VAD: Omit<VadConfig, "marginDb" | "baselineDb" | "f0Range"> = {
  openFrames: 3,
  closeFrames: 15,
  closeHysteresisDb: 5,
  // 3 dB per second, so a floor that rose during speech falls back within a few pauses.
  floorRiseDbPerFrame: 0.06,
  floorSeedFrames: 25,
  f0SlackSemitones: 3,
};

/**
 * Voice detection against an adaptive floor, with a pitch vote.
 *
 * The floor follows the minimum and rises slowly; the gate opens after
 * `openFrames` consecutive frames above floor plus margin (or above the user's
 * baseline minus 8 dB once a self-test exists), and closes after `closeFrames`
 * below the threshold minus the hysteresis. When the user's pitch range is
 * known, three of the last five voiced frames outside it veto an opening, so a
 * partner with a different voice does not start the chatter.
 */
export function createVad(cfg: VadConfig): { step(frame: Frame): VadState } {
  const seed: number[] = [];
  let floor = Number.NaN;
  let speaking = false;
  let above = 0;
  let below = 0;
  const recentVoiced: boolean[] = [];
  const lo = cfg.f0Range ? cfg.f0Range.lo / Math.pow(2, cfg.f0SlackSemitones / 12) : 0;
  const hi = cfg.f0Range ? cfg.f0Range.hi * Math.pow(2, cfg.f0SlackSemitones / 12) : Infinity;

  return {
    step(frame: Frame): VadState {
      const level = frame.levelADb;
      if (Number.isNaN(floor)) {
        seed.push(level);
        if (seed.length < cfg.floorSeedFrames) {
          return { speaking: false, floorDb: Math.min(...seed), thresholdDb: Infinity };
        }
        floor = median(seed);
      } else if (level < floor) {
        floor = level;
      } else {
        floor += cfg.floorRiseDbPerFrame;
      }

      let threshold = floor + cfg.marginDb;
      if (cfg.baselineDb !== null) threshold = Math.max(threshold, cfg.baselineDb - 8);

      if (frame.f0Hz !== null && cfg.f0Range) {
        recentVoiced.push(frame.f0Hz < lo || frame.f0Hz > hi);
        if (recentVoiced.length > 5) recentVoiced.shift();
      }
      const foreignVoice = recentVoiced.filter(Boolean).length >= 3;

      if (!speaking) {
        if (level > threshold) {
          above += 1;
          if (above >= cfg.openFrames && !foreignVoice) {
            speaking = true;
            below = 0;
          }
        } else {
          above = 0;
        }
      } else if (level < threshold - cfg.closeHysteresisDb) {
        below += 1;
        if (below >= cfg.closeFrames) {
          speaking = false;
          above = 0;
        }
      } else {
        below = 0;
      }
      return { speaking, floorDb: floor, thresholdDb: threshold };
    },
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
