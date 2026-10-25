import { describe, expect, it } from "vitest";
import {
  fmtDuration,
  fmtMeters,
  fmtMetersShort,
  fmtPercent,
  fmtSignedDb,
  listNames,
} from "@/lib/format";

describe("format", () => {
  it("signs a decibel change after rounding, so nothing reads as minus zero", () => {
    expect(fmtSignedDb(4)).toBe("+4.0 dB");
    expect(fmtSignedDb(-12)).toBe("−12.0 dB");
    expect(fmtSignedDb(-0.001)).toBe("0.0 dB");
    expect(fmtSignedDb(0.04)).toBe("0.0 dB");
    expect(fmtSignedDb(2.5, 0)).toBe("+3 dB");
  });

  it("describes reach in words at the clamps", () => {
    expect(fmtMeters(0.3)).toBe("under half a meter");
    expect(fmtMeters(6)).toBe("across the room");
    expect(fmtMeters(1.74)).toBe("about 1.7 m");
  });

  it("leaves whole meters whole", () => {
    expect(fmtMetersShort(1)).toBe("1 m");
    expect(fmtMetersShort(1.5)).toBe("1.5 m");
    expect(fmtMetersShort(2.96)).toBe("3 m");
    expect(fmtMetersShort(0.3)).toBe("under 0.5 m");
    expect(fmtMetersShort(6)).toBe("over 6 m");
    expect(fmtMeters(2.04)).toBe("about 2 m");
  });

  it("lists names the way people say them", () => {
    expect(listNames([])).toBe("");
    expect(listNames(["Jane"])).toBe("Jane");
    expect(listNames(["Jane", "Tom"])).toBe("Jane and Tom");
    expect(listNames(["Jane", "Tom", "Ana"])).toBe("Jane, Tom and Ana");
  });

  it("formats durations and percentages for a report", () => {
    expect(fmtDuration(45)).toBe("45 s");
    expect(fmtDuration(125)).toBe("2 min 5 s");
    expect(fmtDuration(3600)).toBe("1 h 0 min");
    expect(fmtPercent(0.4)).toBe("under 1%");
    expect(fmtPercent(2.8)).toBe("3%");
  });
});
