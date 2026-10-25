/**
 * The share of an envelope's fluctuation that sits at syllable rate.
 *
 * Speech intensity pulses at roughly 2 to 8 Hz; a fan, a dishwasher or a cuff
 * pump holds nearly steady. The envelope is a run of frame levels in dB; the
 * result is the power between bandLo and bandHi divided by the power between
 * totalLo and totalHi, in the range 0 to 1.
 */
export function modulationRatio(
  envelopeDb: readonly number[],
  frameRateHz: number,
  bandLo = 2,
  bandHi = 8,
  totalLo = 0.5,
  totalHi = 25,
): number {
  const n = envelopeDb.length;
  if (n < 8) return 0;
  const lin = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.pow(10, (envelopeDb[i] ?? 0) / 20);
    lin[i] = v;
    mean += v;
  }
  mean /= n;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    lin[i] = ((lin[i] ?? 0) - mean) * w;
  }

  const binHz = frameRateHz / n;
  let band = 0;
  let total = 0;
  for (let k = 1; k < n / 2; k++) {
    const f = k * binHz;
    if (f < totalLo || f > totalHi) continue;
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * k * i) / n;
      re += (lin[i] ?? 0) * Math.cos(ang);
      im -= (lin[i] ?? 0) * Math.sin(ang);
    }
    const p = re * re + im * im;
    total += p;
    if (f >= bandLo && f <= bandHi) band += p;
  }
  return total > 0 ? band / total : 0;
}
