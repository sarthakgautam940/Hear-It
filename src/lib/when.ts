const NIGHT_ENDS = 5;
const NOON = 12;
const EVENING = 17;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

type PartOfDay = "morning" | "afternoon" | "night";

function partOfDay(d: Date): PartOfDay {
  const hour = d.getHours();
  if (hour < NIGHT_ENDS || hour >= EVENING) return "night";
  return hour < NOON ? "morning" : "afternoon";
}

/* Until five in the morning it is still the night before, the way a family counts it. */
function nightOf(d: Date): Date {
  return new Date(d.getTime() - NIGHT_ENDS * HOUR_MS);
}

function dayNumber(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
}

/** How a family names a conversation: "Tonight", "Last night", "Thursday afternoon", "October 12". */
export function nightTitle(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "A conversation";
  const part = partOfDay(d);
  const day = nightOf(d);
  const days = Math.round(dayNumber(nightOf(now)) - dayNumber(day));
  if (days === 0) return part === "night" ? "Tonight" : `This ${part}`;
  if (days === 1) return part === "night" ? "Last night" : `Yesterday ${part}`;
  if (days > 1 && days < 7) {
    return `${day.toLocaleDateString("en-US", { weekday: "long" })} ${part}`;
  }
  return day.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(day.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** "7:42 PM". */
export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Oct 25". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
