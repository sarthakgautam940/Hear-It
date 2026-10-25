import { describe, expect, it } from "vitest";
import { JOLT, JOLT_WINDOW_MS, SHAKE_REST_MS, shakeDetector } from "@/platform/shake";
import { follow, settle, THROUGH_SHARE } from "@/ui/swipe";

const still = (t: number) => ({ x: 0, y: 9.8, z: 0, t });
const jolted = (t: number) => ({ x: JOLT + 6, y: 9.8, z: 0, t });

describe("shakeDetector", () => {
  it("calls three quick jolts a shake", () => {
    const detect = shakeDetector();
    const shook = [still(0), jolted(100), still(200), jolted(300)].map(detect);
    expect(shook).toEqual([false, false, false, true]);
  });

  it("ignores a phone that is only carried", () => {
    const detect = shakeDetector();
    const readings = Array.from({ length: 40 }, (_, i) => ({
      x: Math.sin(i / 3) * 4,
      y: 9.8 + Math.cos(i / 4) * 3,
      z: 1,
      t: i * 50,
    }));
    expect(readings.some(detect)).toBe(false);
  });

  it("needs the jolts close together", () => {
    const detect = shakeDetector();
    const gap = JOLT_WINDOW_MS;
    const shook = [still(0), jolted(gap), still(2 * gap), jolted(3 * gap)].map(detect);
    expect(shook.some(Boolean)).toBe(false);
  });

  it("rests after a shake so one shake asks once", () => {
    const detect = shakeDetector();
    [still(0), jolted(100), still(200), jolted(300)].forEach(detect);
    const again = [still(400), jolted(500), still(600), jolted(700)].map(detect);
    expect(again.some(Boolean)).toBe(false);
    const later = SHAKE_REST_MS + 400;
    const after = [still(later), jolted(later + 100), still(later + 200)].map(detect);
    expect(after[2]).toBe(true);
  });
});

describe("swipe rows", () => {
  const width = 350;
  const open = 168;

  it("springs open past halfway and shut short of it", () => {
    expect(settle(-100, 0, width, open, true)).toBe("open");
    expect(settle(-60, 0, width, open, true)).toBe("closed");
  });

  it("follows a flick over where the row was let go", () => {
    expect(settle(-40, -0.8, width, open, false)).toBe("open");
    expect(settle(-150, 0.8, width, open, false)).toBe("closed");
  });

  it("goes through only on a row that can, and only far enough across", () => {
    const far = -width * (THROUGH_SHARE + 0.05);
    expect(settle(far, 0, width, open, true)).toBe("through");
    expect(settle(far, 0, width, open, false)).toBe("open");
  });

  it("gives a little past the open position, unless the row can go through", () => {
    expect(follow(-100, open, false)).toBe(-100);
    expect(follow(-268, open, false)).toBeCloseTo(-open - 30);
    expect(follow(-268, open, true)).toBe(-268);
    expect(follow(40, open, true)).toBeCloseTo(6);
  });
});
