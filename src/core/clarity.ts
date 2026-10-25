import type { Frame } from "./types";
import { leq } from "./dsp/level";

/**
 * Consonant energy over vowel energy: the 1 to 4 kHz band against 100 Hz to
 * 1 kHz, in dB. Speech produced in noise flattens its spectral tilt, so this
 * rises with the chatter; an amplifier cannot change it.
 */
export function clarityDb(loDb: number, hiDb: number): number {
  return hiDb - loDb;
}

export function utteranceClarity(frames: readonly Frame[]): number | null {
  const usable = frames.filter((f) => !f.clipped);
  const lo = leq(usable.map((f) => f.loDb));
  const hi = leq(usable.map((f) => f.hiDb));
  if (lo === null || hi === null) return null;
  return clarityDb(lo, hi);
}
