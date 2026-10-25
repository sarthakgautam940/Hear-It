import { describe, expect, it } from "vitest";
import { clockTime, nightTitle, shortDate } from "@/lib/when";

const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();
const now = new Date(2026, 9, 25, 9, 30);

describe("night title", () => {
  it("names today by the part of the day", () => {
    expect(nightTitle(at(2026, 10, 25, 8), new Date(2026, 9, 25, 20))).toBe("This morning");
    expect(nightTitle(at(2026, 10, 25, 14), new Date(2026, 9, 25, 20))).toBe("This afternoon");
    expect(nightTitle(at(2026, 10, 25, 19), new Date(2026, 9, 25, 20))).toBe("Tonight");
  });

  it("calls a late conversation last night the next morning", () => {
    expect(nightTitle(at(2026, 10, 24, 23, 10), now)).toBe("Last night");
    expect(nightTitle(at(2026, 10, 24, 13), now)).toBe("Yesterday afternoon");
  });

  it("keeps the small hours with the night before, until five", () => {
    expect(nightTitle(at(2026, 10, 25, 0, 48), new Date(2026, 9, 25, 1, 0))).toBe("Tonight");
    expect(nightTitle(at(2026, 10, 25, 0, 48), new Date(2026, 9, 25, 10, 0))).toBe("Last night");
    expect(nightTitle(at(2026, 10, 23, 1, 30), now)).toBe("Thursday night");
    expect(nightTitle(at(2026, 10, 25, 5, 30), new Date(2026, 9, 25, 9))).toBe("This morning");
  });

  it("uses the weekday within a week and the date after it", () => {
    expect(nightTitle(at(2026, 10, 22, 18), now)).toBe("Thursday night");
    expect(nightTitle(at(2026, 10, 12, 18), now)).toBe("October 12");
    expect(nightTitle(at(2025, 12, 31, 18), now)).toBe("December 31, 2025");
  });

  it("has a name for a date it cannot read", () => {
    expect(nightTitle("not a date", now)).toBe("A conversation");
  });
});

describe("clock time and date", () => {
  it("reads hours and minutes on a twelve-hour clock", () => {
    expect(clockTime(at(2026, 10, 24, 19, 42)).replace(/\s/g, " ")).toBe("7:42 PM");
    expect(clockTime("not a date")).toBe("");
  });

  it("gives a short date", () => {
    expect(shortDate(at(2026, 10, 25, 0, 48))).toBe("Oct 25");
    expect(shortDate("not a date")).toBe("");
  });
});
