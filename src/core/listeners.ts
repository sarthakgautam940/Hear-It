import type { Hearing, Listener } from "./types";

export const MAX_LISTENERS = 6;
export const MAX_LABEL_LENGTH = 14;
export const SEAT_DISTANCES_M: readonly number[] = [1, 1.5, 2, 2.5];

export const HEARING_LABEL: Record<Hearing, string> = {
  well: "Hears well in noise",
  some: "Some trouble in noise",
  alot: "Hearing aids, or a lot of trouble in noise",
};

export const HEARING_SHORT: Record<Hearing, string> = {
  well: "Hears well",
  some: "Some trouble",
  alot: "A lot of trouble",
};

/** Seats spread across the far side of the table, in degrees from straight ahead. */
export function seatAngles(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const span = Math.min(140, 50 * (count - 1));
  return Array.from({ length: count }, (_, i) => -span / 2 + (span * i) / (count - 1));
}

export function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0] ?? "").slice(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[words.length - 1]?.[0] ?? "")).toUpperCase();
}

export function newListener(
  id: string,
  label: string,
  hearing: Hearing,
  distanceM: number,
): Listener {
  return { id, label: label.trim().slice(0, MAX_LABEL_LENGTH), hearing, distanceM };
}

export function isHearing(v: unknown): v is Hearing {
  return v === "well" || v === "some" || v === "alot";
}
