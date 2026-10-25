import type { Session, Utterance } from "./types";
import { leq, meanKnown } from "./dsp/level";

export interface SeatShare {
  /** Share of utterances the seat was in reach for, with chatter on and off. */
  on: number | null;
  off: number | null;
}

export interface ChatterCourse {
  /** The sentence from which the level held for three in a row, or null if it never did. */
  settledAfter: number | null;
  /** How many times the level moved between one sentence and the next. */
  changes: number;
  /** The level during the last sentence, in dB below the loudest setting; null when off. */
  finalGainDb: number | null;
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
  chatter: ChatterCourse;
}

export function createSession(
  id: string,
  startedAt: string,
  listenerIds: readonly string[],
): Session {
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
  const clarityOn = meanKnown(on.map((u) => u.clarityDb));
  const clarityOff = meanKnown(off.map((u) => u.clarityDb));
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
    chatter: chatterCourse(s.utterances),
  };
}

/** How the controller moved, read back from the level each sentence was spoken under. */
export function chatterCourse(utterances: readonly Utterance[]): ChatterCourse {
  const gains = utterances.map((u) => u.chatterGainDb);
  let changes = 0;
  for (let i = 1; i < gains.length; i++) if (gains[i] !== gains[i - 1]) changes++;
  let settledAfter: number | null = null;
  for (let i = 0; i + 2 < gains.length; i++) {
    if (gains[i] === gains[i + 1] && gains[i] === gains[i + 2]) {
      settledAfter = i + 1;
      break;
    }
  }
  return { settledAfter, changes, finalGainDb: gains[gains.length - 1] ?? null };
}

function share(utterances: readonly Utterance[], id: string): number | null {
  if (utterances.length === 0) return null;
  return utterances.filter((u) => u.inReach.includes(id)).length / utterances.length;
}
