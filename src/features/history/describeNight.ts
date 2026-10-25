import { REACH_MAX_M, REACH_MIN_M, type SeatState } from "@/core/reach";
import type { ChatterCourse } from "@/core/session";
import { fmtDuration, fmtMetersShort, fmtPercent, fmtSignedDb, listNames } from "@/lib/format";

/*
  A conversation's report in words: who heard you in the headline, then what the
  chatter did for your voice in a few plain sentences, never a grid of numbers.
*/

/** The share of sentences someone had to be in reach for to count as having heard you. */
export const HEARD_SHARE = 2 / 3;
/** Below this share they mostly missed it; between the two they were straining. */
export const MISSED_SHARE = 1 / 3;

export function shareState(share: number | null): SeatState | null {
  if (share === null) return null;
  return share >= HEARD_SHARE ? "hears" : share >= MISSED_SHARE ? "straining" : "far";
}

export interface NightFacts {
  people: ReadonlyArray<{ name: string; share: number | null }>;
  sentences: number;
  seconds: number | null;
  gainDb: number | null;
  clarityDb: number | null;
  reachOnM: number | null;
  reachOffM: number | null;
  chatterSeconds: number;
  dosePercent: number;
  course: ChatterCourse;
  estimated: boolean;
}

export interface NightWords {
  headline: string;
  sub: string;
  voice: string[];
}

/** A reach in a sentence: meters in between, words at the ends of the scale. */
function reachWords(m: number): string {
  if (m >= REACH_MAX_M) return "across the room";
  if (m <= REACH_MIN_M) return "under half a meter";
  return fmtMetersShort(m);
}

function chatterCourse(course: ChatterCourse): string | null {
  if (course.changes === 0) return null;
  if (course.settledAfter === null) return "It was still finding its level when you stopped.";
  const n = course.settledAfter;
  return `It found its level after ${n} ${n === 1 ? "sentence" : "sentences"}.`;
}

export function describeNight(f: NightFacts): NightWords {
  const sentences = `${f.sentences} ${f.sentences === 1 ? "sentence" : "sentences"}`;
  const sub = f.seconds === null ? `${sentences}.` : `${sentences} over ${fmtDuration(f.seconds)}.`;

  let headline: string;
  if (f.people.length > 0) {
    const heard = f.people.filter((p) => shareState(p.share) === "hears").map((p) => p.name);
    headline =
      heard.length === f.people.length
        ? "Everyone heard you"
        : heard.length > 0
          ? `${listNames(heard)} heard you`
          : "Most of it didn’t reach the table";
  } else {
    headline =
      f.gainDb === null ? `${sentences} heard` : `${fmtSignedDb(f.gainDb)} louder with the chatter`;
  }

  const voice: string[] = [];
  if (f.gainDb !== null) {
    const reach =
      f.reachOnM !== null && f.reachOffM !== null
        ? `, and your voice carried ${reachWords(f.reachOnM)} instead of ${reachWords(f.reachOffM)}`
        : "";
    voice.push(`With the chatter you spoke ${fmtSignedDb(f.gainDb)} louder${reach}.`);
  } else if (f.chatterSeconds > 0) {
    voice.push("Every sentence had chatter, so there is no quieter sentence to compare.");
  } else {
    voice.push("The chatter never needed to play, so there is nothing to compare.");
  }
  if (f.clarityDb !== null && f.clarityDb > 0) {
    voice.push(
      `Your consonants came through ${fmtSignedDb(f.clarityDb)} clearer, something turning a voice up cannot do.`,
    );
  }
  if (f.chatterSeconds > 0) {
    const course = chatterCourse(f.course);
    voice.push(
      `The chatter played for ${fmtDuration(f.chatterSeconds)}, ${fmtPercent(f.dosePercent)} of a day’s safe listening.${course ? ` ${course}` : ""}`,
    );
  }
  if (f.estimated) voice.push("Levels are estimates until you calibrate in Settings.");
  return { headline, sub, voice };
}
