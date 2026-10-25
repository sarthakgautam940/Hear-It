import { Biquad, bilinear, cascadeResponseDb, type BiquadCoeffs } from "./biquad";

/* IEC 61672 pole frequencies of the A-weighting curve, in Hz. */
const F1 = 20.598997;
const F2 = 107.65265;
const F3 = 737.86223;
const F4 = 12194.217;

/** The analog A-weighting response, normalized to 0 dB at 1 kHz. */
export function aWeightingDb(f: number): number {
  return 20 * Math.log10(rA(f) / rA(1000));
}

function rA(f: number): number {
  const f2 = f * f;
  return (
    (F4 * F4 * f2 * f2) /
    ((f2 + F1 * F1) * Math.sqrt((f2 + F2 * F2) * (f2 + F3 * F3)) * (f2 + F4 * F4))
  );
}

/**
 * Three second-order sections from the analog poles, bilinear-transformed with
 * pre-warping at 1 kHz so the response there is exact, then scaled so 1 kHz
 * reads 0 dB after the transform. Warping compresses the top octave, so the
 * digital curve sits below the analog one above 8 kHz; the tests hold it inside
 * the IEC 61672 class 1 tolerance there, which is the only promise a sampled
 * weighting filter can make.
 */
export function designAWeighting(fs: number): BiquadCoeffs[] {
  const wRef = 2 * Math.PI * 1000;
  const c = wRef / Math.tan(wRef / (2 * fs));
  const w1 = 2 * Math.PI * F1;
  const w2 = 2 * Math.PI * F2;
  const w3 = 2 * Math.PI * F3;
  const w4 = 2 * Math.PI * F4;
  const sections = [
    bilinear([1, 0, 0], [1, 2 * w1, w1 * w1], c),
    bilinear([1, 0, 0], [1, w2 + w3, w2 * w3], c),
    bilinear([0, 0, 1], [1, 2 * w4, w4 * w4], c),
  ];
  const first = sections[0];
  if (!first) throw new Error("A-weighting design produced no sections");
  const gainAt1k = Math.pow(10, cascadeResponseDb(sections, 1000, fs) / 20);
  sections[0] = {
    ...first,
    b0: first.b0 / gainAt1k,
    b1: first.b1 / gainAt1k,
    b2: first.b2 / gainAt1k,
  };
  return sections;
}

export interface SampleFilter {
  process(x: number): number;
  reset(): void;
}

export function createAWeightingFilter(fs: number): SampleFilter {
  const stages = designAWeighting(fs).map((c) => new Biquad(c));
  return {
    process(x: number): number {
      let y = x;
      for (const s of stages) y = s.process(y);
      return y;
    },
    reset(): void {
      for (const s of stages) s.reset();
    },
  };
}

export function aWeightingResponseDb(fs: number, f: number): number {
  return cascadeResponseDb(designAWeighting(fs), f, fs);
}
