import { synthesizeBabble } from "@/core/dsp/babble-synth";
import { makeSeamlessLoop } from "@/core/dsp/loop";

/* Set at build time from the files present in public/babble, so nothing is fetched that is not there. */
const RECORDED_SOURCES = (process.env.NEXT_PUBLIC_BABBLE_FILES ?? "")
  .split(",")
  .filter(Boolean)
  .map((file) => `/babble/${file}`);
const TARGET_RMS_DB = -20;
const LOOP_FADE_S = 0.05;
const SYNTH_SECONDS = 8;
const SYNTH_TALKERS = 6;
const SYNTH_SEED = 0x5eed;

export type BabbleSource = "recorded" | "synthesized";

export interface Babble {
  buffer: AudioBuffer;
  source: BabbleSource;
}

/**
 * The team's six-talker recording when it is present, otherwise six talkers
 * synthesized from formant resonators with syllable rhythm, pauses and pitch
 * drift. Either way the loop is made seamless and set to the same RMS, so the
 * controller's levels mean the same thing.
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
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function normalize(ctx: AudioContext, input: AudioBuffer): AudioBuffer {
  const mono = new Float32Array(input.length);
  for (let c = 0; c < input.numberOfChannels; c++) {
    const data = input.getChannelData(c);
    for (let i = 0; i < mono.length; i++)
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / input.numberOfChannels;
  }
  return toBuffer(
    ctx,
    scaleToRms(makeSeamlessLoop(mono, Math.round(LOOP_FADE_S * input.sampleRate))),
    input.sampleRate,
  );
}

function synthesize(ctx: AudioContext): AudioBuffer {
  const fs = ctx.sampleRate;
  const mix = synthesizeBabble(fs, {
    seconds: SYNTH_SECONDS,
    talkers: SYNTH_TALKERS,
    seed: SYNTH_SEED,
  });
  return toBuffer(ctx, scaleToRms(makeSeamlessLoop(mix, Math.round(LOOP_FADE_S * fs))), fs);
}

function scaleToRms(samples: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += (samples[i] ?? 0) ** 2;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  if (rms === 0) return samples;
  const scale = Math.pow(10, TARGET_RMS_DB / 20) / rms;
  for (let i = 0; i < samples.length; i++)
    samples[i] = Math.max(-1, Math.min(1, (samples[i] ?? 0) * scale));
  return samples;
}

function toBuffer(ctx: AudioContext, samples: Float32Array, fs: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, samples.length, fs);
  buffer.getChannelData(0).set(samples);
  return buffer;
}
