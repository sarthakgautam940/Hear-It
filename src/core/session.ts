import type { Session, Utterance } from "./types";
import { leq } from "./dsp/level";

export interface SeatShare {
  /** Share of utterances the seat was in reach for, with chatter on and off. */
  on: number | null;
  off: number | null;
}

export interface SessionSummary {
  utteranceCount: number;
  meanOffDba: number | null;
  meanOnDba: number | null;
  gainDb: number | null;
  clarityChangeDb: number | null;
  speechSeconds: number;
  chatterSeconds: number;
  dosePercent: number;
  seatShares: Record<string, SeatShare>;
}

export function createSession(id: string, startedAt: string, listenerIds: readonly string[]): Session {
  return {
    id,
    startedAt,
    endedAt: null,
    utterances: [],
    speechSeconds: 0,
    chatterSeconds: 0,
    dosePercent: 0,
    noiseDba: null,
    listenerIds: [...listenerIds],
  };
}

export function summarizeSession(s: Session): SessionSummary {
  const on = s.utterances.filter((u) => u.chatterOn);
  const off = s.utterances.filter((u) => !u.chatterOn);
  const meanOn = leq(on.map((u) => u.levelDba));
  const meanOff = leq(off.map((u) => u.levelDba));
  const clarityOn = mean(on.map((u) => u.clarityDb).filter(isNumber));
  const clarityOff = mean(off.map((u) => u.clarityDb).filter(isNumber));
  const seatShares: Record<string, SeatShare> = {};
  for (const id of s.listenerIds) {
    seatShares[id] = { on: share(on, id), off: share(off, id) };
  }
  return {
    utteranceCount: s.utterances.length,
    meanOffDba: meanOff,
    meanOnDba: meanOn,
    gainDb: meanOn !== null && meanOff !== null ? meanOn - meanOff : null,
    clarityChangeDb: clarityOn !== null && clarityOff !== null ? clarityOn - clarityOff : null,
    speechSeconds: s.speechSeconds,
    chatterSeconds: s.chatterSeconds,
    dosePercent: s.dosePercent,
    seatShares,
  };
}

function share(utterances: readonly Utterance[], id: string): number | null {
  if (utterances.length === 0) return null;
  return utterances.filter((u) => u.inReach.includes(id)).length / utterances.length;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function isNumber(v: number | null): v is number {
  return v !== null;
}
