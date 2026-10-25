import { bandpass, Biquad, lowpass } from "./biquad";

export interface BabbleSynthOptions {
  seconds: number;
  talkers: number;
  seed: number;
}

/** Average first three formants of five vowels for men, in Hz (Peterson and Barney 1952). */
const VOWELS = [
  [730, 1090, 2440],
  [270, 2290, 3010],
  [300, 870, 2240],
  [530, 1840, 2480],
  [570, 840, 2410],
] as const;
const FORMANT_BANDWIDTH_HZ: readonly [number, number, number] = [80, 100, 140];
const FORMANT_GAIN: readonly [number, number, number] = [1, 0.5, 0.25];
/** Women's vocal tracts are shorter, so their formants sit about 17% higher. */
const WOMAN_FORMANT_SCALE = 1.17;
const MAN_F0_HZ = 110;
const WOMAN_F0_HZ = 200;
/** The glottal source falls about 12 dB per octave; a sawtooth gives 6 of them and this low-pass the rest. */
const GLOTTAL_LOWPASS_HZ = 900;
const ASPIRATION = 0.02;
const SYLLABLE_MS: readonly [number, number] = [130, 260];
const PHRASE_SYLLABLES: readonly [number, number] = [4, 9];
const PAUSE_MS: readonly [number, number] = [250, 600];
const STAGGER_S = 0.5;
const ONSET_S = 0.03;
const OFFSET_S = 0.045;

/**
 * Multi-talker babble from first principles. Each talker is a pulse source at
 * a drifting pitch through three formant resonators, cut into syllables of
 * random vowels, stress and length, with pauses between phrases. The result
 * carries the spectral tilt and the syllable-rate modulation of speech, which
 * is what the Lombard response answers to, without a word in it. Deterministic
 * for a seed; the caller sets the level and seals the loop.
 */
export function synthesizeBabble(fs: number, options: BabbleSynthOptions): Float32Array {
  const mix = new Float32Array(Math.round(options.seconds * fs));
  const random = makeRandom(options.seed);
  for (let t = 0; t < options.talkers; t++) addTalker(mix, fs, t % 2 === 1, random);
  return mix;
}

function addTalker(mix: Float32Array, fs: number, woman: boolean, random: () => number): void {
  const n = mix.length;
  const baseF0 = (woman ? WOMAN_F0_HZ : MAN_F0_HZ) * between(random, 0.9, 1.1);
  const formantScale = woman ? WOMAN_FORMANT_SCALE : 1;
  const glottal = new Biquad(lowpass(fs, GLOTTAL_LOWPASS_HZ));
  let phase = 0;
  let i = Math.floor(random() * STAGGER_S * fs);

  while (i < n) {
    const syllables = Math.round(between(random, PHRASE_SYLLABLES[0], PHRASE_SYLLABLES[1]));
    const phraseF0 = baseF0 * between(random, 0.95, 1.1);
    for (let s = 0; s < syllables && i < n; s++) {
      const vowel = VOWELS[Math.floor(random() * VOWELS.length)] ?? VOWELS[0];
      const resonators = vowel.map((f, k) => {
        const fc = f * formantScale;
        return new Biquad(bandpass(fs, fc, fc / (FORMANT_BANDWIDTH_HZ[k] ?? 100)));
      });
      const length = Math.round((between(random, SYLLABLE_MS[0], SYLLABLE_MS[1]) / 1000) * fs);
      const stress = between(random, 0.55, 1);
      // Pitch declines across the phrase and wobbles within each syllable.
      const f0From = phraseF0 * (1 - (0.15 * s) / syllables) * between(random, 0.94, 1.06);
      const f0To = f0From * between(random, 0.94, 1.06);
      for (let j = 0; j < length && i < n; j++, i++) {
        const u = j / length;
        phase += (f0From + (f0To - f0From) * u) / fs;
        if (phase >= 1) phase -= 1;
        const pulse = glottal.process(2 * phase - 1) + ASPIRATION * (random() * 2 - 1);
        const edge = Math.min(1, j / fs / ONSET_S, (length - j) / fs / OFFSET_S);
        const envelope = stress * (0.5 - 0.5 * Math.cos(Math.PI * edge));
        let v = 0;
        for (let k = 0; k < resonators.length; k++) {
          v += (FORMANT_GAIN[k] ?? 0) * (resonators[k]?.process(pulse) ?? 0);
        }
        mix[i] = (mix[i] ?? 0) + v * envelope;
      }
    }
    i += Math.round((between(random, PAUSE_MS[0], PAUSE_MS[1]) / 1000) * fs);
  }
}

function between(random: () => number, lo: number, hi: number): number {
  return lo + (hi - lo) * random();
}

/* mulberry32: small, seeded, and the same on every platform. */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
