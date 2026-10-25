import { REACH_MAX_M, REACH_MIN_M, type SeatState } from "@/core/reach";
import { fmtMeters, listNames } from "@/lib/format";

export interface TableCopy {
  headline: string;
  sub: string;
  /** The part of `sub` set in bold: the distance, when there is one. */
  emphasis: string | null;
}

interface TableInput {
  live: boolean;
  reachWell: number | null;
  seats: ReadonlyArray<{ label: string; state: SeatState | null }>;
}

function reachLine(well: number): { sub: string; emphasis: string | null } {
  if (well >= REACH_MAX_M) return { sub: "Your voice carries across the room.", emphasis: null };
  const distance = well <= REACH_MIN_M ? fmtMeters(REACH_MIN_M) : fmtMeters(well);
  return { sub: `Your voice reaches ${distance}.`, emphasis: distance };
}

function verb(names: readonly string[]): string {
  return names.length === 1 ? "is" : "are";
}

/** The Talk screen's headline: the result in a sentence, then the distance. */
export function describeTable({ live, reachWell, seats }: TableInput): TableCopy {
  const names = seats.map((s) => s.label);
  if (!live) {
    if (seats.length === 0) {
      return {
        headline: "Your table",
        sub: "Add the people you talk with, and they will sit here.",
        emphasis: null,
      };
    }
    const who =
      names.length <= 3
        ? `${listNames(names)} ${verb(names)} at the table.`
        : `${names.length} people are at the table.`;
    return { headline: "Ready when you are", sub: who, emphasis: null };
  }
  if (reachWell === null) {
    return {
      headline: "Say something",
      sub: "The first sentence lights the table.",
      emphasis: null,
    };
  }
  if (seats.length === 0) {
    const headline =
      reachWell >= REACH_MAX_M
        ? "Carrying across the room"
        : `Reaching ${fmtMeters(Math.max(reachWell, REACH_MIN_M))}`;
    return { headline, sub: "For someone who hears well in noise.", emphasis: null };
  }
  const line = reachLine(reachWell);
  const far = seats.filter((s) => s.state === "far").map((s) => s.label);
  const straining = seats.filter((s) => s.state === "straining").map((s) => s.label);
  if (far.length === 0 && straining.length === 0) {
    return { headline: "Everyone can hear you", ...line };
  }
  if (far.length > 0) {
    const also =
      straining.length > 0 ? `${listNames(straining)} ${verb(straining)} straining. ` : "";
    return {
      headline: `${listNames(far)} can’t hear you`,
      sub: `${also}${line.sub}`,
      emphasis: line.emphasis,
    };
  }
  return {
    headline: `${listNames(straining)} ${verb(straining)} straining to hear`,
    ...line,
  };
}
