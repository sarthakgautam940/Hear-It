import type { Hearing, Listener, NoiseKind } from "./types";

export const REACH_MIN_M = 0.3;
export const REACH_MAX_M = 6;
/** Direct speech falls 6 dB per doubling in free field and 4 to 6 in rooms; the room's own slope replaces this after validation. */
export const DEFAULT_ALPHA_DB_PER_DOUBLING = 5;
/** A quiet home room, the reference the noise cost is measured against. */
export const QUIET_ROOM_DBA = 40;

/**
 * Signal-to-noise a listener needs: +2 dB for half the key words in four-talker
 * babble (QuickSIN), about 6 dB more for nearly all of them at the median
 * intelligibility slope, plus the midpoint of the QuickSIN loss class.
 */
export const REQUIRED_SNR_DB: Record<Hearing, number> = { well: 8, some: 13, alot: 19 };

/** Steady noise masks less than voices: the HINT threshold sits about 5 dB below QuickSIN's. */
export const STEADY_NOISE_ADJUST_DB = -5;

export const HEARING_ORDER: readonly Hearing[] = ["well", "some", "alot"];

export function requiredSnr(hearing: Hearing, kind: NoiseKind = "voices"): number {
  return REQUIRED_SNR_DB[hearing] + (kind === "steady" ? STEADY_NOISE_ADJUST_DB : 0);
}

/** Speech level at a distance from its level at 1 m. */
export function levelAtDistance(l1Dba: number, distanceM: number, alpha = DEFAULT_ALPHA_DB_PER_DOUBLING): number {
  return l1Dba - alpha * Math.log2(distanceM);
}

/** The distance at which the voice still clears the noise by the listener's margin. */
export function reachM(
  l1Dba: number,
  noiseDba: number,
  hearing: Hearing,
  alpha = DEFAULT_ALPHA_DB_PER_DOUBLING,
  kind: NoiseKind = "voices",
): number {
  const r = Math.pow(2, (l1Dba - noiseDba - requiredSnr(hearing, kind)) / alpha);
  return Math.max(REACH_MIN_M, Math.min(REACH_MAX_M, r));
}

export function reachAll(
  l1Dba: number,
  noiseDba: number,
  alpha = DEFAULT_ALPHA_DB_PER_DOUBLING,
  kind: NoiseKind = "voices",
): Record<Hearing, number> {
  return {
    well: reachM(l1Dba, noiseDba, "well", alpha, kind),
    some: reachM(l1Dba, noiseDba, "some", alpha, kind),
    alot: reachM(l1Dba, noiseDba, "alot", alpha, kind),
  };
}

/** How much reach the room's noise costs against a quiet room. */
export function noiseCostM(
  l1Dba: number,
  noiseDba: number,
  hearing: Hearing,
  alpha = DEFAULT_ALPHA_DB_PER_DOUBLING,
  kind: NoiseKind = "voices",
): number {
  return reachM(l1Dba, QUIET_ROOM_DBA, hearing, alpha, kind) - reachM(l1Dba, noiseDba, hearing, alpha, kind);
}

/** The margin a seat has: speech at its distance, over the noise, over what it needs. */
export function seatMarginDb(
  l1Dba: number,
  noiseDba: number,
  listener: Pick<Listener, "hearing" | "distanceM">,
  alpha = DEFAULT_ALPHA_DB_PER_DOUBLING,
  kind: NoiseKind = "voices",
): number {
  return levelAtDistance(l1Dba, listener.distanceM, alpha) - noiseDba - requiredSnr(listener.hearing, kind);
}

export type SeatState = "hears" | "straining" | "far";

/** A 3 dB band either side of zero: the meter's own uncertainty plus the class midpoint's spread. */
export const SEAT_BAND_DB = 3;

export function seatState(marginDb: number): SeatState {
  if (marginDb >= SEAT_BAND_DB) return "hears";
  if (marginDb > -SEAT_BAND_DB) return "straining";
  return "far";
}

export function inReach(listeners: readonly Listener[], reach: Record<Hearing, number>): string[] {
  return listeners.filter((l) => l.distanceM <= reach[l.hearing]).map((l) => l.id);
}

/** The factor a change in voice level multiplies the reach by. */
export function reachFactor(gainDb: number, alpha = DEFAULT_ALPHA_DB_PER_DOUBLING): number {
  return Math.pow(2, gainDb / alpha);
}
