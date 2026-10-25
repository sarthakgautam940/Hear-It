export const DBFS_FLOOR = -120;

export function frameRms(x: Float32Array): number {
  if (x.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] ?? 0;
    sum += v * v;
  }
  return Math.sqrt(sum / x.length);
}

export function rmsToDbfs(rms: number): number {
  if (!(rms > 0)) return DBFS_FLOOR;
  return Math.max(DBFS_FLOOR, 20 * Math.log10(rms));
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** Energy mean of levels in dB, the Leq of a sound level meter. */
export function leq(levelsDb: readonly number[]): number | null {
  if (levelsDb.length === 0) return null;
  let sum = 0;
  for (const l of levelsDb) sum += Math.pow(10, l / 10);
  return 10 * Math.log10(sum / levelsDb.length);
}

/**
 * A first-order exponential smoother on sound energy, which is what a meter's
 * "fast" setting is. The first value seeds the state so the display does not
 * climb from silence.
 */
export function makeLevelSmoother(tauMs: number, dtMs: number): (levelDb: number) => number {
  const alpha = 1 - Math.exp(-dtMs / tauMs);
  let power: number | null = null;
  return (levelDb: number) => {
    const p = Math.pow(10, levelDb / 10);
    power = power === null ? p : power + alpha * (p - power);
    return 10 * Math.log10(power);
  };
}
