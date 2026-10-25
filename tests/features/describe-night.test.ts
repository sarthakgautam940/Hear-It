import { describe, expect, it } from "vitest";
import { REACH_MAX_M } from "@/core/reach";
import { describeNight, shareState, type NightFacts } from "@/features/history/describeNight";

const night = (over: Partial<NightFacts> = {}): NightFacts => ({
  people: [],
  sentences: 12,
  seconds: 600,
  gainDb: 4,
  clarityDb: null,
  reachOnM: 2.4,
  reachOffM: 1.5,
  chatterSeconds: 300,
  dosePercent: 2,
  course: { settledAfter: 3, changes: 2, finalGainDb: -6 },
  estimated: false,
  ...over,
});

describe("shareState", () => {
  it("reads a share as hearing, straining or missing you", () => {
    expect(shareState(null)).toBeNull();
    expect(shareState(1)).toBe("hears");
    expect(shareState(2 / 3)).toBe("hears");
    expect(shareState(0.5)).toBe("straining");
    expect(shareState(1 / 3)).toBe("straining");
    expect(shareState(0.2)).toBe("far");
  });
});

describe("describeNight", () => {
  it("leads with who heard you", () => {
    const ana = { name: "Ana", share: 0.9 };
    const tom = { name: "Tom", share: 0.8 };
    const jane = { name: "Jane", share: 0.4 };
    expect(describeNight(night({ people: [ana, tom] })).headline).toBe("Everyone heard you");
    expect(describeNight(night({ people: [ana, tom, jane] })).headline).toBe(
      "Ana and Tom heard you",
    );
    expect(describeNight(night({ people: [jane] })).headline).toBe(
      "Most of it didn’t reach the table",
    );
  });

  it("leads with the lift when nobody was at the table", () => {
    expect(describeNight(night()).headline).toBe("+4.0 dB louder with the chatter");
    expect(describeNight(night({ gainDb: null, sentences: 1 })).headline).toBe("1 sentence heard");
  });

  it("says how long it ran", () => {
    expect(describeNight(night()).sub).toBe("12 sentences over 10 min.");
    expect(describeNight(night({ seconds: null })).sub).toBe("12 sentences.");
  });

  it("tells the voice in sentences, never a grid of numbers", () => {
    const voice = describeNight(night()).voice;
    expect(voice[0]).toBe(
      "With the chatter you spoke +4.0 dB louder, and your voice carried 2.4 m instead of 1.5 m.",
    );
    expect(voice[1]).toBe(
      "The chatter played for 5 min, 2% of a day’s safe listening. It found its level after 3 sentences.",
    );
    expect(voice).toHaveLength(2);
  });

  it("says plainly when there is nothing to compare", () => {
    expect(describeNight(night({ gainDb: null })).voice[0]).toBe(
      "Every sentence had chatter, so there is no quieter sentence to compare.",
    );
    expect(describeNight(night({ gainDb: null, chatterSeconds: 0 })).voice).toEqual([
      "The chatter never needed to play, so there is nothing to compare.",
    ]);
  });

  it("puts the ends of the reach scale in words", () => {
    expect(describeNight(night({ reachOnM: REACH_MAX_M })).voice[0]).toContain(
      "carried across the room instead of 1.5 m",
    );
  });

  it("mentions clearer consonants only when they were clearer", () => {
    expect(describeNight(night({ clarityDb: 1.2 })).voice[1]).toContain("+1.2 dB clearer");
    expect(describeNight(night({ clarityDb: -0.5 })).voice.join(" ")).not.toContain("clearer");
  });

  it("flags estimated levels last", () => {
    const voice = describeNight(night({ estimated: true })).voice;
    expect(voice[voice.length - 1]).toBe("Levels are estimates until you calibrate in Settings.");
  });
});
