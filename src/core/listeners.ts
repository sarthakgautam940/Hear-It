import { seatDistanceM, type SeatSlot } from "./seats";
import type { Hearing, Listener } from "./types";

export const MAX_LISTENERS = 6;
export const MAX_LABEL_LENGTH = 14;

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

/* One name is one letter, as a phone's contacts show it; the name itself sits beside the chip. */
export function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0]?.[0] ?? "").toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[words.length - 1]?.[0] ?? "")).toUpperCase();
}

export function newListener(id: string, label: string, hearing: Hearing, seat: SeatSlot): Listener {
  return {
    id,
    label: label.trim().slice(0, MAX_LABEL_LENGTH),
    hearing,
    seat,
    distanceM: seatDistanceM(seat),
  };
}

/** The chairs everyone else sits in, with their names, so a sheet can show them as taken. */
export function seatsTaken(
  listeners: readonly Listener[],
  except: string | null,
): Map<SeatSlot, string> {
  return new Map(listeners.filter((l) => l.id !== except).map((l) => [l.seat, l.label]));
}

export function isHearing(v: unknown): v is Hearing {
  return v === "well" || v === "some" || v === "alot";
}
