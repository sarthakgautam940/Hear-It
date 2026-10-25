import { leq } from "@/core/dsp/level";

export interface PlotDot {
  x: number;
  /** Vertical nudge, so sentences at nearly the same level stay visible side by side. */
  dy: number;
}

export interface PlotRow {
  dots: PlotDot[];
  meanDba: number | null;
  meanX: number | null;
}

export interface LevelPlotLayout {
  lo: number;
  hi: number;
  without: PlotRow;
  with: PlotRow;
}

/* A small difference is not drawn as a large one: the axis always spans at least this much. */
const MIN_SPAN_DB = 6;
const NEAR_PX = 10;
const STACK = [0, -8, 8, -16, 16];

/** Where each sentence's dot goes on a shared decibel axis, and each group's energy mean. */
export function levelPlotLayout(
  levels: ReadonlyArray<{ boosted: boolean; dba: number }>,
  x0: number,
  x1: number,
): LevelPlotLayout {
  const all = levels.map((l) => l.dba);
  let lo = all.length > 0 ? Math.floor(Math.min(...all)) - 1 : 50;
  let hi = all.length > 0 ? Math.ceil(Math.max(...all)) + 1 : 50 + MIN_SPAN_DB;
  if (hi - lo < MIN_SPAN_DB) {
    lo = Math.floor((lo + hi) / 2 - MIN_SPAN_DB / 2);
    hi = lo + MIN_SPAN_DB;
  }
  const x = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const row = (boosted: boolean): PlotRow => {
    const values = levels
      .filter((l) => l.boosted === boosted)
      .map((l) => l.dba)
      .sort((a, b) => a - b);
    const dots: PlotDot[] = [];
    for (const v of values) {
      const px = x(v);
      const near = dots.filter((d) => Math.abs(d.x - px) < NEAR_PX).length;
      dots.push({ x: px, dy: STACK[near % STACK.length] ?? 0 });
    }
    const mean = leq(values);
    return { dots, meanDba: mean, meanX: mean === null ? null : x(mean) };
  };
  return { lo, hi, without: row(false), with: row(true) };
}
