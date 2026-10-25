import { createAWeightingFilter } from "@/core/dsp/aweighting";
import { Biquad, highpass, lowpass } from "@/core/dsp/biquad";
import { rmsToDbfs } from "@/core/dsp/level";
import { autocorrelationPitch } from "@/core/dsp/pitch";
import type { Frame } from "@/core/types";

export const LEVEL_PROCESSOR_NAME = "hearit-level";
const FRAME_MS = 20;
const PITCH_WINDOW_MS = 40;
const PITCH_EVERY_FRAMES = 2;
const CLIP_LEVEL = 0.99;

/**
 * One frame every 20 ms, counted in samples rather than render quanta, since a
 * 128-sample quantum does not divide 20 ms at any common rate. Each frame
 * carries the raw and A-weighted RMS, two band levels for the clarity index,
 * a pitch estimate from a decimated 40 ms window, and a clipping flag. Samples
 * never leave this scope.
 */
class LevelProcessor extends AudioWorkletProcessor {
  private readonly frameLen = Math.round((sampleRate * FRAME_MS) / 1000);
  private readonly aWeight = createAWeightingFilter(sampleRate);
  private readonly loBand = [
    new Biquad(highpass(sampleRate, 100)),
    new Biquad(lowpass(sampleRate, 1000)),
  ];
  private readonly hiBand = [
    new Biquad(highpass(sampleRate, 1000)),
    new Biquad(lowpass(sampleRate, 4000)),
  ];

  private readonly decimation = Math.max(1, Math.round(sampleRate / 8000));
  private readonly pitchRate = sampleRate / this.decimation;
  private readonly antiAlias = new Biquad(lowpass(sampleRate, this.pitchRate * 0.4));
  private readonly pitchWindow = new Float32Array(
    Math.round((this.pitchRate * PITCH_WINDOW_MS) / 1000),
  );
  private pitchWrite = 0;
  private pitchFilled = 0;
  private decimationPhase = 0;

  private count = 0;
  private sumSq = 0;
  private sumSqA = 0;
  private sumSqLo = 0;
  private sumSqHi = 0;
  private peak = 0;
  private frameIndex = 0;

  override process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      const x = channel[i] ?? 0;
      this.sumSq += x * x;
      const a = this.aWeight.process(x);
      this.sumSqA += a * a;
      const lo = this.loBand[1]!.process(this.loBand[0]!.process(x));
      this.sumSqLo += lo * lo;
      const hi = this.hiBand[1]!.process(this.hiBand[0]!.process(x));
      this.sumSqHi += hi * hi;
      const mag = Math.abs(x);
      if (mag > this.peak) this.peak = mag;

      const smoothed = this.antiAlias.process(x);
      if (++this.decimationPhase >= this.decimation) {
        this.decimationPhase = 0;
        this.pitchWindow[this.pitchWrite] = smoothed;
        this.pitchWrite = (this.pitchWrite + 1) % this.pitchWindow.length;
        if (this.pitchFilled < this.pitchWindow.length) this.pitchFilled++;
      }

      if (++this.count >= this.frameLen) this.emitFrame();
    }
    return true;
  }

  private emitFrame(): void {
    const n = this.count;
    const frame: Frame = {
      tMs: currentTime * 1000,
      levelDb: rmsToDbfs(Math.sqrt(this.sumSq / n)),
      levelADb: rmsToDbfs(Math.sqrt(this.sumSqA / n)),
      loDb: rmsToDbfs(Math.sqrt(this.sumSqLo / n)),
      hiDb: rmsToDbfs(Math.sqrt(this.sumSqHi / n)),
      f0Hz: this.frameIndex % PITCH_EVERY_FRAMES === 0 ? this.estimatePitch() : null,
      clipped: this.peak >= CLIP_LEVEL,
    };
    this.port.postMessage(frame);
    this.frameIndex++;
    this.count = 0;
    this.sumSq = 0;
    this.sumSqA = 0;
    this.sumSqLo = 0;
    this.sumSqHi = 0;
    this.peak = 0;
  }

  private estimatePitch(): number | null {
    if (this.pitchFilled < this.pitchWindow.length) return null;
    const ordered = new Float32Array(this.pitchWindow.length);
    for (let i = 0; i < ordered.length; i++) {
      ordered[i] = this.pitchWindow[(this.pitchWrite + i) % this.pitchWindow.length] ?? 0;
    }
    return autocorrelationPitch(ordered, this.pitchRate);
  }
}

registerProcessor(LEVEL_PROCESSOR_NAME, LevelProcessor);
