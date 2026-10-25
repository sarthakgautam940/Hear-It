/** Second-order section with a0 normalized to 1. */
export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** Direct form II transposed: one multiply-add path, stable in single precision. */
export class Biquad {
  private z1 = 0;
  private z2 = 0;

  constructor(readonly c: BiquadCoeffs) {}

  process(x: number): number {
    const { b0, b1, b2, a1, a2 } = this.c;
    const y = b0 * x + this.z1;
    this.z1 = b1 * x - a1 * y + this.z2;
    this.z2 = b2 * x - a2 * y;
    return y;
  }

  reset(): void {
    this.z1 = 0;
    this.z2 = 0;
  }
}

/** Butterworth low-pass (RBJ cookbook). */
export function lowpass(fs: number, fc: number, q = Math.SQRT1_2): BiquadCoeffs {
  const w0 = (2 * Math.PI * fc) / fs;
  const cosw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cosw) / 2 / a0,
    b1: (1 - cosw) / a0,
    b2: (1 - cosw) / 2 / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0,
  };
}

/** Butterworth high-pass (RBJ cookbook). */
export function highpass(fs: number, fc: number, q = Math.SQRT1_2): BiquadCoeffs {
  const w0 = (2 * Math.PI * fc) / fs;
  const cosw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: (1 + cosw) / 2 / a0,
    b1: -(1 + cosw) / a0,
    b2: (1 + cosw) / 2 / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0,
  };
}

/**
 * Bilinear transform of an analog second-order section
 * (b2 s^2 + b1 s + b0) / (a2 s^2 + a1 s + a0) with s = c (1 - z^-1) / (1 + z^-1).
 * Pass c = 2 fs for the plain transform, or w / tan(w / (2 fs)) to match the
 * analog response exactly at angular frequency w.
 */
export function bilinear(
  b: readonly [number, number, number],
  a: readonly [number, number, number],
  c: number,
): BiquadCoeffs {
  const [b2, b1, b0] = b;
  const [a2, a1, a0] = a;
  const c2 = c * c;
  const B0 = b2 * c2 + b1 * c + b0;
  const B1 = 2 * b0 - 2 * b2 * c2;
  const B2 = b2 * c2 - b1 * c + b0;
  const A0 = a2 * c2 + a1 * c + a0;
  const A1 = 2 * a0 - 2 * a2 * c2;
  const A2 = a2 * c2 - a1 * c + a0;
  return { b0: B0 / A0, b1: B1 / A0, b2: B2 / A0, a1: A1 / A0, a2: A2 / A0 };
}

/** Magnitude response of a cascade in dB at frequency f. */
export function cascadeResponseDb(sections: readonly BiquadCoeffs[], f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs;
  const c1 = Math.cos(w);
  const s1 = Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = Math.sin(2 * w);
  let mag = 1;
  for (const { b0, b1, b2, a1, a2 } of sections) {
    const nr = b0 + b1 * c1 + b2 * c2;
    const ni = -(b1 * s1 + b2 * s2);
    const dr = 1 + a1 * c1 + a2 * c2;
    const di = -(a1 * s1 + a2 * s2);
    mag *= Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
  return 20 * Math.log10(mag);
}
