import { describe, expect, it } from "vitest";
import { synthesizeBabble } from "@/core/dsp/babble-synth";
import { bandpass, Biquad, cascadeResponseDb, highpass, lowpass } from "@/core/dsp/biquad";
import { frameRms, rmsToDbfs } from "@/core/dsp/level";
import { modulationRatio } from "@/core/dsp/modulation";
import { VOICES_MODULATION_MIN } from "@/core/room";

describe("formant resonator", () => {
  it("peaks at 0 dB at its center and falls away on both sides", () => {
    const fs = 48000;
    const section = [bandpass(fs, 1000, 10)];
    expect(cascadeResponseDb(section, 1000, fs)).toBeCloseTo(0, 2);
    expect(cascadeResponseDb(section, 500, fs)).toBeLessThan(-15);
    expect(cascadeResponseDb(section, 2000, fs)).toBeLessThan(-15);
  });
});

describe("synthesized babble", () => {
  const fs = 16000;
  const mix = synthesizeBabble(fs, { seconds: 6, talkers: 6, seed: 0x5eed });

  it("is the same for the same seed, and not silence", () => {
    expect(synthesizeBabble(fs, { seconds: 6, talkers: 6, seed: 0x5eed })).toEqual(mix);
    expect(synthesizeBabble(fs, { seconds: 6, talkers: 6, seed: 7 })).not.toEqual(mix);
    expect(rmsToDbfs(frameRms(mix))).toBeGreaterThan(-60);
    expect(mix.length).toBe(6 * fs);
  });

  it("pulses at syllable rate, so the room classifier reads it as voices", () => {
    const frame = Math.round(0.02 * fs);
    const levels: number[] = [];
    for (let i = 0; i + frame <= mix.length; i += frame) {
      levels.push(rmsToDbfs(frameRms(mix.subarray(i, i + frame))));
    }
    const windows: number[] = [];
    for (let i = 0; i + 50 <= levels.length; i += 50) {
      windows.push(modulationRatio(levels.slice(i, i + 50), 50));
    }
    const mean = windows.reduce((a, b) => a + b, 0) / windows.length;
    expect(mean).toBeGreaterThan(VOICES_MODULATION_MIN);
  });

  it("carries the spectral tilt of speech, with more energy below 1 kHz than above", () => {
    const lo = [new Biquad(highpass(fs, 100)), new Biquad(lowpass(fs, 1000))];
    const hi = [new Biquad(highpass(fs, 1000)), new Biquad(lowpass(fs, 4000))];
    let energyLo = 0;
    let energyHi = 0;
    for (let i = 0; i < mix.length; i++) {
      const x = mix[i] ?? 0;
      const a = lo[1]!.process(lo[0]!.process(x));
      const b = hi[1]!.process(hi[0]!.process(x));
      energyLo += a * a;
      energyHi += b * b;
    }
    const tiltDb = 10 * Math.log10(energyHi / energyLo);
    expect(tiltDb).toBeLessThan(-3);
    expect(tiltDb).toBeGreaterThan(-25);
  });
});
