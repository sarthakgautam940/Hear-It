import { describe, expect, it } from "vitest";
import { createSession, everyoneShare, sessionSeconds, shareTrend } from "@/core/session";
import type { Utterance } from "@/core/types";

function said(inReach: string[]): Utterance {
  return {
    startMs: 0,
    endMs: 1000,
    levelDba: 62,
    chatterOn: true,
    chatterGainDb: -6,
    clarityDb: null,
    inReach,
  };
}

describe("everyone share", () => {
  it("counts only the sentences that reached every seat", () => {
    const s = createSession("s", "2026-10-24T19:00:00.000Z", ["ana", "jane"]);
    s.utterances.push(said(["ana", "jane"]), said(["ana"]), said(["ana", "jane"]), said([]));
    expect(everyoneShare(s)).toBe(0.5);
  });

  it("has no answer without people or without sentences", () => {
    const empty = createSession("s", "2026-10-24T19:00:00.000Z", []);
    empty.utterances.push(said([]));
    expect(everyoneShare(empty)).toBeNull();
    expect(everyoneShare(createSession("t", "2026-10-24T19:00:00.000Z", ["ana"]))).toBeNull();
  });
});

describe("share trend", () => {
  const seated = (id: string, ...heard: string[][]) => {
    const s = createSession(id, "2026-10-24T19:00:00.000Z", ["ana"]);
    s.utterances.push(...heard.map(said));
    return s;
  };
  const alone = createSession("alone", "2026-10-23T19:00:00.000Z", []);
  alone.utterances.push(said([]));

  it("reads the newest conversations oldest first and averages the known shares", () => {
    const newest = seated("c", ["ana"], []);
    const oldest = seated("a", ["ana"]);
    const trend = shareTrend([newest, alone, oldest], 10);
    expect(trend.values).toEqual([1, null, 0.5]);
    expect(trend.mean).toBe(0.75);
  });

  it("keeps only the most recent, and has no mean without a seated conversation", () => {
    expect(shareTrend([seated("c", ["ana"]), alone, seated("a", [])], 2).values).toEqual([null, 1]);
    expect(shareTrend([alone], 10)).toEqual({ values: [null], mean: null });
  });
});

describe("session length", () => {
  it("runs from start to end in seconds, and is unknown while open", () => {
    const s = createSession("s", "2026-10-24T19:00:00.000Z", []);
    expect(sessionSeconds(s)).toBeNull();
    s.endedAt = "2026-10-24T19:12:30.000Z";
    expect(sessionSeconds(s)).toBe(750);
  });
});
