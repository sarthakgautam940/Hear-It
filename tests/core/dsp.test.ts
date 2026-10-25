import { describe, expect, it } from "vitest";
import { Biquad, lowpass } from "@/core/dsp/biquad";
import { makeSeamlessLoop, seamStep } from "@/core/dsp/loop";
import { modulationRatio } from "@/core/dsp/modulation";
import { autocorrelationPitch } from "@/core/dsp/pitch";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("pitch", () => {
  const fs = 8000;
  const window = Math.round(0.04 * fs);

  function sawtooth(f0: number): Float32Array {
    const out = new Float32Array(window);
    for (let i = 0; i < window; i++) {
      const phase = ((f0 * i) / fs) % 1;
      out[i] = 2 * phase - 1;
    }
    return out;
  }

  it.each([110, 200, 320])("finds a %d Hz sawtooth", (f0) => {
    const got = autocorrelationPitch(sawtooth(f0), fs);
    expect(got).not.toBeNull();
    expect(Math.abs((got ?? 0) - f0)).toBeLessThan(f0 * 0.03);
  });

  it("returns null for noise and for silence", () => {
    const random = seeded(7);
    const noise = new Float32Array(window);
    for (let i = 0; i < window; i++) noise[i] = random() * 2 - 1;
    expect(autocorrelationPitch(noise, fs)).toBeNull();
    expect(autocorrelationPitch(new Float32Array(window), fs)).toBeNull();
  });
});

describe("modulation ratio", () => {
  const frames = 50;
  const rate = 50;

  it("is high for a 4 Hz syllable-rate envelope", () => {
    const env = Array.from(
      { length: frames },
      (_, i) => -30 + 10 * Math.sin((2 * Math.PI * 4 * i) / rate),
    );
    expect(modulationRatio(env, rate)).toBeGreaterThan(0.5);
  });

  it("is near zero for a steady hum", () => {
    const env = Array.from({ length: frames }, () => -30);
    expect(modulationRatio(env, rate)).toBeLessThan(0.05);
  });

  it("is low for a slow drift", () => {
    const env = Array.from(
      { length: frames },
      (_, i) => -30 + 6 * Math.sin((2 * Math.PI * 0.5 * i) / rate),
    );
    expect(modulationRatio(env, rate)).toBeLessThan(0.3);
  });
});

describe("seamless loop", () => {
  it("removes the seam of band-limited noise and shortens by the fade", () => {
    const fs = 44100;
    const random = seeded(11);
    const lp = new Biquad(lowpass(fs, 500));
    const raw = new Float32Array(fs * 2);
    for (let i = 0; i < raw.length; i++) raw[i] = lp.process(random() * 2 - 1) * 4;
    const fade = Math.round(0.05 * fs);
    const looped = makeSeamlessLoop(raw, fade);
    expect(looped.length).toBe(raw.length - fade);
    expect(seamStep(looped)).toBeLessThan(0.05);
    // The untouched middle is the original signal.
    expect(looped[fade + 100]).toBe(raw[fade + 100]);
  });
});
