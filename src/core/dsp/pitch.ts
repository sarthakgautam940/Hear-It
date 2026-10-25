export const F0_MIN_HZ = 60;
export const F0_MAX_HZ = 400;

/**
 * Fundamental frequency by normalized autocorrelation over the lags of the
 * voice range. The first lag whose peak is within 15% of the global maximum
 * wins, which keeps the estimate from landing one octave low. Returns null for
 * an unvoiced or silent window.
 */
export function autocorrelationPitch(
  x: Float32Array,
  fs: number,
  threshold = 0.5,
  fMin = F0_MIN_HZ,
  fMax = F0_MAX_HZ,
): number | null {
  const n = x.length;
  const minLag = Math.floor(fs / fMax);
  const maxLag = Math.min(Math.ceil(fs / fMin), n - 2);
  if (maxLag <= minLag) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i] ?? 0;
  mean /= n;
  const y = new Float64Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const v = (x[i] ?? 0) - mean;
    y[i] = v;
    energy += v * v;
  }
  if (energy <= 1e-12) return null;

  const r = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0;
    let e0 = 0;
    let e1 = 0;
    for (let i = 0; i + lag < n; i++) {
      const a = y[i] ?? 0;
      const b = y[i + lag] ?? 0;
      num += a * b;
      e0 += a * a;
      e1 += b * b;
    }
    r[lag] = e0 > 0 && e1 > 0 ? num / Math.sqrt(e0 * e1) : 0;
  }

  let best = -1;
  for (let lag = minLag; lag <= maxLag; lag++) best = Math.max(best, r[lag] ?? -1);
  if (best < threshold) return null;

  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const v = r[lag] ?? 0;
    if (v >= 0.85 * best && v >= (r[lag - 1] ?? 0) && v >= (r[lag + 1] ?? 0)) {
      return fs / refinePeak(r, lag);
    }
  }
  return null;
}

/* Parabolic interpolation through the three samples around a peak. */
function refinePeak(r: Float64Array, lag: number): number {
  const a = r[lag - 1] ?? 0;
  const b = r[lag] ?? 0;
  const c = r[lag + 1] ?? 0;
  const denom = a - 2 * b + c;
  if (denom === 0) return lag;
  const shift = (0.5 * (a - c)) / denom;
  return lag + Math.max(-0.5, Math.min(0.5, shift));
}
