/*
  The chairs at an eight-seat dining table. You sit at the near head; the others
  sit in three chairs down each side and one at the far head. Each chair's
  distance from you comes from where it really is, so choosing a seat chooses a
  distance, and two people can never sit in one chair.
*/

export type SeatSlot = "L1" | "L2" | "L3" | "R1" | "R2" | "R3" | "H";

/** The order empty chairs fill: nearest first, alternating sides, the far head last. */
export const SEAT_SLOTS: readonly SeatSlot[] = ["L1", "R1", "L2", "R2", "L3", "R3", "H"];

/** A table 2.4 m long and 1 m wide, in meters. */
export const TABLE_LENGTH_M = 2.4;
const TABLE_HALF_WIDTH_M = 0.5;
/** People sit back from the edge they face. */
const SIT_BACK_M = 0.3;
const SIDE_OUT_M = 0.15;
/** Where each side chair's center sits along the table, from your end. */
export const SIDE_ALONG_M: readonly number[] = [0.4, 1.2, 2.0];

export type SeatSide = "left" | "right" | "head";

export function seatSide(slot: SeatSlot): SeatSide {
  return slot === "H" ? "head" : slot.startsWith("L") ? "left" : "right";
}

/** Which chair down its side, 0 nearest you; the head of the table has none. */
export function seatRank(slot: SeatSlot): number {
  return slot === "H" ? SIDE_ALONG_M.length : Number(slot.slice(1)) - 1;
}

/** Where a seated person's mouth is, in meters, with yours at the origin and the table ahead of you. */
export function seatPositionM(slot: SeatSlot): { across: number; ahead: number } {
  if (slot === "H") return { across: 0, ahead: SIT_BACK_M + TABLE_LENGTH_M + SIT_BACK_M };
  const across = TABLE_HALF_WIDTH_M + SIDE_OUT_M;
  return {
    across: seatSide(slot) === "left" ? -across : across,
    ahead: SIT_BACK_M + (SIDE_ALONG_M[seatRank(slot)] ?? 0),
  };
}

/** How far a chair is from you, mouth to mouth, to the centimeter. */
export function seatDistanceM(slot: SeatSlot): number {
  const p = seatPositionM(slot);
  return Math.round(Math.hypot(p.across, p.ahead) * 100) / 100;
}

const SIDE_WORD: Record<"left" | "right", string> = { left: "your left", right: "your right" };
const RANK_WORD = ["next to you", "halfway down", "at the far end"];

/** The chair in words, for a hint and for a screen reader. */
export function seatName(slot: SeatSlot): string {
  if (slot === "H") return "At the head of the table, facing you";
  const side = seatSide(slot) as "left" | "right";
  const rank = RANK_WORD[seatRank(slot)] ?? "";
  return `On ${SIDE_WORD[side]}, ${rank}`;
}

export function isSeatSlot(v: unknown): v is SeatSlot {
  return typeof v === "string" && (SEAT_SLOTS as readonly string[]).includes(v);
}

/** The first empty chair in filling order, or null when every chair is taken. */
export function freeSeat(taken: Iterable<SeatSlot>): SeatSlot | null {
  const used = new Set(taken);
  return SEAT_SLOTS.find((s) => !used.has(s)) ?? null;
}

/**
 * Gives a chair to everyone who has none yet, keeping the chairs people already
 * hold: each takes the free chair nearest the distance they gave, nearest people
 * first.
 */
export function seatEveryone<T extends { distanceM: number; seat?: SeatSlot | undefined }>(
  people: readonly T[],
): (T & { seat: SeatSlot })[] {
  const used = new Set<SeatSlot>();
  for (const p of people) if (p.seat && !used.has(p.seat)) used.add(p.seat);
  const seated = new Map<T, SeatSlot>();
  const seen = new Set<SeatSlot>();
  for (const p of people) {
    if (p.seat && !seen.has(p.seat)) {
      seated.set(p, p.seat);
      seen.add(p.seat);
    }
  }
  const waiting = people.filter((p) => !seated.has(p)).sort((a, b) => a.distanceM - b.distanceM);
  for (const p of waiting) {
    const best = SEAT_SLOTS.filter((s) => !used.has(s)).sort(
      (a, b) => Math.abs(seatDistanceM(a) - p.distanceM) - Math.abs(seatDistanceM(b) - p.distanceM),
    )[0];
    if (!best) continue;
    used.add(best);
    seated.set(p, best);
  }
  return people.filter((p) => seated.has(p)).map((p) => ({ ...p, seat: seated.get(p)! }));
}
