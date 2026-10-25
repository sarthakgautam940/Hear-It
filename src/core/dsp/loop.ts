/**
 * Folds the last `fadeSamples` of a buffer into its first `fadeSamples` with an
 * equal-power crossfade, so playing the result on a loop has no seam: the
 * sample after the last one is the sample that followed it in the original.
 */
export function makeSeamlessLoop(samples: Float32Array, fadeSamples: number): Float32Array {
  const n = samples.length;
  const fade = Math.max(0, Math.min(fadeSamples, Math.floor(n / 2)));
  const outLen = n - fade;
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const head = samples[i] ?? 0;
    if (i < fade) {
      const w = (i / fade) * (Math.PI / 2);
      const tail = samples[n - fade + i] ?? 0;
      out[i] = head * Math.sin(w) + tail * Math.cos(w);
    } else {
      out[i] = head;
    }
  }
  return out;
}

/** The jump a loop would make from its last sample back to its first. */
export function seamStep(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  return Math.abs((samples[0] ?? 0) - (samples[samples.length - 1] ?? 0));
}
