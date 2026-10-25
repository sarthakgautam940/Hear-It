import { describe, expect, it } from "vitest";
import { levelPlotLayout } from "@/features/voicecheck/plot";

const at = (dba: number, boosted = false) => ({ dba, boosted });

describe("level plot layout", () => {
  it("keeps at least six decibels on the axis, so a small gain is not drawn as a large one", () => {
    const layout = levelPlotLayout([at(61), at(61, true)], 0, 100);
    expect([layout.lo, layout.hi]).toEqual([58, 64]);
    expect(layout.without.dots[0]?.x).toBe(50);
  });

  it("widens the axis past the loudest and quietest sentences", () => {
    const layout = levelPlotLayout([at(55.2), at(66.8, true)], 0, 100);
    expect([layout.lo, layout.hi]).toEqual([54, 68]);
  });

  it("stacks sentences at the same level instead of hiding one under another", () => {
    const layout = levelPlotLayout([at(61), at(61), at(61), at(64, true)], 0, 100);
    expect(layout.without.dots.map((d) => d.dy)).toEqual([0, -8, 8]);
  });

  it("marks each group at its energy mean, not its arithmetic mean", () => {
    const layout = levelPlotLayout([at(60), at(70), at(65, true)], 0, 100);
    expect(layout.without.meanDba).toBeCloseTo(67.4, 1);
    expect(layout.with.meanDba).toBeCloseTo(65, 6);
  });
});
