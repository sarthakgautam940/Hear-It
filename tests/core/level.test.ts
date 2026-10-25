import { describe, expect, it } from "vitest";
import { frameRms, leq, makeLevelSmoother, rmsToDbfs } from "@/core/dsp/level";

function sine(freq: number, fs: number, n: number, amp = 1): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / fs);
  return out;
}

describe("level", () => {
  it("reads a full-scale sine as -3.01 dBFS", () => {
    const db = rmsToDbfs(frameRms(sine(1000, 48000, 48000)));
    expect(db).toBeCloseTo(-3.01, 2);
  });

  it("floors silence at -120 dBFS", () => {
    expect(rmsToDbfs(0)).toBe(-120);
    expect(rmsToDbfs(frameRms(new Float32Array(960)))).toBe(-120);
  });

  it("takes the energy mean for Leq", () => {
    expect(leq([-20, -30])).toBeCloseTo(-22.6, 1);
    expect(leq([])).toBeNull();
  });

  it("smooths on energy with the given time constant", () => {
    const smooth = makeLevelSmoother(125, 20);
    expect(smooth(-40)).toBeCloseTo(-40, 6);
    let v = -40;
    for (let i = 0; i < 6; i++) v = smooth(-20);
    // After one time constant (125 ms, about 6 frames) the step has closed by 1 - 1/e in energy.
    const closed = (Math.pow(10, v / 10) - 1e-4) / (1e-2 - 1e-4);
    expect(closed).toBeGreaterThan(0.6);
    expect(closed).toBeLessThan(0.7);
  });
});
