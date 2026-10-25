import { REACH_MAX_M, REACH_MIN_M } from "@/core/reach";

/* Tenths of a meter, with a whole number left whole: "1.5 m", "2 m". */
function meters(m: number): string {
  return `${Number(m.toFixed(1))} m`;
}

export function fmtMeters(m: number): string {
  if (m <= REACH_MIN_M) return "under half a meter";
  if (m >= REACH_MAX_M) return "across the room";
  return `about ${meters(m)}`;
}

export function fmtMetersShort(m: number): string {
  if (m <= REACH_MIN_M) return "under 0.5 m";
  if (m >= REACH_MAX_M) return "over 6 m";
  return meters(m);
}

export function fmtDb(x: number, digits = 0): string {
  return `${x.toFixed(digits)} dB`;
}

export function fmtDba(x: number): string {
  return `${Math.round(x)} dBA`;
}

export function fmtSignedDb(x: number, digits = 1): string {
  const rounded = Number(x.toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toFixed(digits)} dB`;
}

export function fmtPercent(x: number): string {
  if (x < 1) return "under 1%";
  return `${Math.round(x)}%`;
}

export function fmtDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest ? `${m} min ${rest} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Jane", "Jane and Tom", "Jane, Tom and Ana". */
export function listNames(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
