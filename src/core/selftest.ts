import type { EarMode, F0Range, SelfTestResult, SelfTestSentence } from "./types";
import { leq, meanKnown } from "./dsp/level";

/** The first ten sentences of the Rainbow Passage (Fairbanks 1960), the standard reading text in speech science. */
export const SELF_TEST_SENTENCES: readonly string[] = [
  "When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.",
  "The rainbow is a division of white light into many beautiful colors.",
  "These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon.",
  "There is, according to legend, a boiling pot of gold at one end.",
  "People look, but no one ever finds it.",
  "When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow.",
  "Throughout the centuries people have explained the rainbow in various ways.",
  "Some have accepted it as a miracle without physical explanation.",
  "To the Hebrews it was a token that there would be no more universal floods.",
  "The Greeks used to imagine that it was a sign from the gods to foretell war or heavy rain.",
];

export const SENTENCE_COUNT = SELF_TEST_SENTENCES.length;
export const BOOSTED_COUNT = 5;
export const MAX_RUN = 3;
/** Below this the reflex may be weak for this person, which hearing loss can cause. */
export const WEAK_GAIN_DB = 2;

/* mulberry32: a small seeded generator, so a schedule is reproducible from its seed. */
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

/** Exactly five boosted of ten, in an order with no run longer than three. */
export function makeSchedule(seed: number): boolean[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const random = makeRandom(seed + attempt * 7919);
    const order = Array.from({ length: SENTENCE_COUNT }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const a = order[i] ?? 0;
      order[i] = order[j] ?? 0;
      order[j] = a;
    }
    const schedule = new Array<boolean>(SENTENCE_COUNT).fill(false);
    for (let i = 0; i < BOOSTED_COUNT; i++) schedule[order[i] ?? 0] = true;
    if (longestRun(schedule) <= MAX_RUN) return schedule;
  }
  throw new Error("self-test schedule could not be drawn");
}

export function longestRun(schedule: readonly boolean[]): number {
  let longest = 0;
  let run = 0;
  let prev: boolean | null = null;
  for (const v of schedule) {
    run = v === prev ? run + 1 : 1;
    prev = v;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function summarizeSelfTest(
  sentences: readonly SelfTestSentence[],
  ear: EarMode,
  measuredAt: string,
): SelfTestResult | null {
  const boosted = sentences.filter((s) => s.boosted).map((s) => s.leqDb);
  const plain = sentences.filter((s) => !s.boosted).map((s) => s.leqDb);
  const on = leq(boosted);
  const off = leq(plain);
  if (on === null || off === null) return null;
  const clarityOn = meanKnown(sentences.filter((s) => s.boosted).map((s) => s.clarityDb));
  const clarityOff = meanKnown(sentences.filter((s) => !s.boosted).map((s) => s.clarityDb));
  const f0s = sentences
    .filter((s) => !s.boosted)
    .flatMap((s) => s.f0s)
    .sort((a, b) => a - b);
  return {
    gainDb: on - off,
    baselineDb: off,
    clarityChangeDb: clarityOn !== null && clarityOff !== null ? clarityOn - clarityOff : null,
    f0Range: f0s.length >= 10 ? percentileRange(f0s, 0.05, 0.95) : null,
    sentences: [...sentences],
    ear,
    measuredAt,
  };
}

function percentileRange(sorted: readonly number[], lo: number, hi: number): F0Range {
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return { lo: at(lo), hi: at(hi) };
}
