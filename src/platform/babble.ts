import { Biquad, lowpass } from "@/core/dsp/biquad";
import { makeSeamlessLoop } from "@/core/dsp/loop";

const RECORDED_SOURCES = ["/babble/six-talker.m4a", "/babble/six-talker.ogg"];
const TARGET_RMS_DB = -20;
const LOOP_FADE_S = 0.05;
const SYNTH_SECONDS = 8;
const SYNTH_TALKERS = 6;

export type BabbleSource = "recorded" | "synthesized";

export interface Babble {
  buffer: AudioBuffer;
  source: BabbleSource;
}

/**
 * The team's six-talker recording when it is present, otherwise a synthesized
 * stand-in: six streams of low-passed noise, each pulsing at its own syllable
 * rate, mixed and normalized. Either way the loop is made seamless and set to
 * the same RMS so the controller's levels mean the same thing.
 */
export async function loadBabble(ctx: AudioContext): Promise<Babble> {
  for (const url of RECORDED_SOURCES) {
    const decoded = await tryDecode(ctx, url);
    if (decoded) return { buffer: normalize(ctx, decoded), source: "recorded" };
  }
  return { buffer: synthesize(ctx), source: "synthesized" };
}

async function tryDecode(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function normalize(ctx: AudioContext, input: AudioBuffer): AudioBuffer {
  const mono = new Float32Array(input.length);
  for (let c = 0; c < input.numberOfChannels; c++) {
    const data = input.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / input.numberOfChannels;
  }
  return toBuffer(ctx, scaleToRms(makeSeamlessLoop(mono, Math.round(LOOP_FADE_S * input.sampleRate))), input.sampleRate);
}

function synthesize(ctx: AudioContext): AudioBuffer {
  const fs = ctx.sampleRate;
  const n = Math.round(SYNTH_SECONDS * fs);
  const mix = new Float32Array(n);
  const random = seededRandom(0x5eed);
  for (let t = 0; t < SYNTH_TALKERS; t++) {
    const shape = new Biquad(lowpass(fs, 500));
    const rate = 3 + (t * 0.55) % 3;
    const phase = random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const noise = shape.process(random() * 2 - 1);
      const envelope = 1 - 0.6 * (0.5 + 0.5 * Math.sin((2 * Math.PI * rate * i) / fs + phase));
      mix[i] = (mix[i] ?? 0) + noise * envelope;
    }
  }
  return toBuffer(ctx, scaleToRms(makeSeamlessLoop(mix, Math.round(LOOP_FADE_S * fs))), fs);
}

function scaleToRms(samples: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += (samples[i] ?? 0) ** 2;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  if (rms === 0) return samples;
  const scale = Math.pow(10, TARGET_RMS_DB / 20) / rms;
  for (let i = 0; i < samples.length; i++) samples[i] = Math.max(-1, Math.min(1, (samples[i] ?? 0) * scale));
  return samples;
}

function toBuffer(ctx: AudioContext, samples: Float32Array, fs: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, samples.length, fs);
  buffer.copyToChannel(samples, 0);
  return buffer;
}

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
