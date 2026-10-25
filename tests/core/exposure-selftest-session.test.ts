import { describe, expect, it } from "vitest";
import { allowedHours, dosePercent, estimatedEarLevelDba } from "@/core/exposure";
import { longestRun, makeSchedule, SELF_TEST_SENTENCES, summarizeSelfTest } from "@/core/selftest";
import { createSession, summarizeSession } from "@/core/session";

describe("exposure", () => {
  it("follows the NIOSH 3 dB exchange rate", () => {
    expect(allowedHours(85)).toBeCloseTo(8, 6);
    expect(allowedHours(88)).toBeCloseTo(4, 6);
    expect(allowedHours(91)).toBeCloseTo(2, 6);
    expect(allowedHours(100)).toBeCloseTo(0.25, 6);
    expect(allowedHours(80)).toBeCloseTo(25.4, 1);
  });

  it("puts a 42 minute dinner at the cap at 2.8% of a day", () => {
    expect(dosePercent(42 * 60, 80)).toBeCloseTo(2.8, 1);
  });

  it("estimates the ear level from the cap and a non-positive gain", () => {
    expect(estimatedEarLevelDba(0)).toBe(80);
    expect(estimatedEarLevelDba(-12)).toBe(68);
    expect(estimatedEarLevelDba(3)).toBe(80);
  });
});

describe("self-test", () => {
  it("reads ten sentences", () => {
    expect(SELF_TEST_SENTENCES).toHaveLength(10);
  });

  it("boosts exactly five of ten with no run longer than three, for every seed", () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const schedule = makeSchedule(seed);
      expect(schedule).toHaveLength(10);
      expect(schedule.filter(Boolean)).toHaveLength(5);
      expect(longestRun(schedule)).toBeLessThanOrEqual(3);
    }
  });

  it("is reproducible from its seed", () => {
    expect(makeSchedule(42)).toEqual(makeSchedule(42));
  });

  it("reports the gain, the baseline and the pitch range", () => {
    const sentences = Array.from({ length: 10 }, (_, i) => ({
      boosted: i % 2 === 0,
      leqDb: i % 2 === 0 ? -26 : -30,
      f0s: i % 2 === 0 ? [] : Array.from({ length: 20 }, (_, k) => 190 + k * 3),
    }));
    const result = summarizeSelfTest(sentences, "left", "2026-10-25T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result?.gainDb).toBeCloseTo(4, 6);
    expect(result?.baselineDb).toBeCloseTo(-30, 6);
    // Five identical sentences give 100 voiced frames, five per pitch value, so the 5th
    // percentile lands on the second value and the 95th on the last.
    expect(result?.f0Range?.lo).toBe(193);
    expect(result?.f0Range?.hi).toBe(247);
  });

  it("returns null without both conditions", () => {
    expect(summarizeSelfTest([{ boosted: true, leqDb: -20, f0s: [] }], "left", "x")).toBeNull();
  });
});

describe("session", () => {
  it("summarizes gain, clarity and the seats' share", () => {
    const s = createSession("s1", "2026-10-25T01:00:00.000Z", ["a", "b"]);
    s.utterances.push(
      { startMs: 0, endMs: 1000, levelDba: 60, chatterOn: false, chatterGainDb: null, clarityDb: -6, inReach: ["a"] },
      { startMs: 2000, endMs: 3000, levelDba: 60, chatterOn: false, chatterGainDb: null, clarityDb: -6, inReach: [] },
      { startMs: 4000, endMs: 5000, levelDba: 64, chatterOn: true, chatterGainDb: -12, clarityDb: -4, inReach: ["a", "b"] },
      { startMs: 6000, endMs: 7000, levelDba: 64, chatterOn: true, chatterGainDb: -12, clarityDb: -4, inReach: ["a"] },
    );
    s.speechSeconds = 4;
    s.chatterSeconds = 2;
    const summary = summarizeSession(s);
    expect(summary.utteranceCount).toBe(4);
    expect(summary.gainDb).toBeCloseTo(4, 6);
    expect(summary.clarityChangeDb).toBeCloseTo(2, 6);
    expect(summary.seatShares.a).toEqual({ on: 1, off: 0.5 });
    expect(summary.seatShares.b).toEqual({ on: 0.5, off: 0 });
  });

  it("reports absence rather than zero when a condition never happened", () => {
    const s = createSession("s2", "2026-10-25T01:00:00.000Z", ["a"]);
    s.utterances.push({ startMs: 0, endMs: 1000, levelDba: 60, chatterOn: false, chatterGainDb: null, clarityDb: null, inReach: [] });
    const summary = summarizeSession(s);
    expect(summary.meanOnDba).toBeNull();
    expect(summary.gainDb).toBeNull();
    expect(summary.seatShares.a).toEqual({ on: null, off: 0 });
  });
});
