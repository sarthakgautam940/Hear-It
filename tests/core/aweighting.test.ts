import { describe, expect, it } from "vitest";
import { aWeightingDb, aWeightingResponseDb, createAWeightingFilter } from "@/core/dsp/aweighting";
import { frameRms, rmsToDbfs } from "@/core/dsp/level";

/* IEC 61672 nominal A-weighting values at the standard frequencies. */
const TABLE: ReadonlyArray<readonly [number, number]> = [
  [31.5, -39.4],
  [63, -26.2],
  [125, -16.1],
  [250, -8.6],
  [500, -3.2],
  [1000, 0.0],
  [2000, 1.2],
  [4000, 1.0],
  [8000, -1.1],
  [16000, -6.6],
];

describe("A-weighting", () => {
  it("matches the IEC 61672 table from the analog formula", () => {
    for (const [f, expected] of TABLE) {
      expect(Math.abs(aWeightingDb(f) - expected)).toBeLessThanOrEqual(0.15);
    }
  });

  it.each([48000, 44100])("holds the analog curve at %d Hz within the stated tolerances", (fs) => {
    for (const [f, expected] of TABLE) {
      const got = aWeightingResponseDb(fs, f);
      if (f <= 4000) {
        expect(Math.abs(got - expected)).toBeLessThanOrEqual(0.5);
      } else if (f === 8000) {
        expect(Math.abs(got - expected)).toBeLessThanOrEqual(1.5);
      } else {
        // Bilinear warping compresses the top octave; class 1 allows +3.5 / -17 dB at 16 kHz.
        expect(got).toBeLessThanOrEqual(expected + 3.5);
        expect(got).toBeGreaterThanOrEqual(expected - 17);
      }
    }
  });

  it("leaves a 1 kHz sine at the same level", () => {
    const fs = 48000;
    const filter = createAWeightingFilter(fs);
    const n = fs;
    const input = new Float32Array(n);
    const output = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      input[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / fs);
      output[i] = filter.process(input[i] ?? 0);
    }
    // Skip the first 100 ms so the filter has settled.
    const settledIn = input.subarray(4800);
    const settledOut = output.subarray(4800);
    expect(rmsToDbfs(frameRms(settledOut)) - rmsToDbfs(frameRms(settledIn))).toBeCloseTo(0, 1);
  });

  it("attenuates 63 Hz by about 26 dB", () => {
    const fs = 48000;
    const filter = createAWeightingFilter(fs);
    const n = fs * 2;
    const input = new Float32Array(n);
    const output = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      input[i] = 0.5 * Math.sin((2 * Math.PI * 63 * i) / fs);
      output[i] = filter.process(input[i] ?? 0);
    }
    const delta =
      rmsToDbfs(frameRms(output.subarray(fs))) - rmsToDbfs(frameRms(input.subarray(fs)));
    expect(delta).toBeCloseTo(-26.2, 0);
  });
});
