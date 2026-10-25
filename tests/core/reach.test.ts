import { describe, expect, it } from "vitest";
import { clarityDb } from "@/core/clarity";
import { HEARING_LABEL, initials, newListener } from "@/core/listeners";
import {
  inReach,
  levelAtDistance,
  noiseCostM,
  reachAll,
  reachFactor,
  reachM,
  requiredSnr,
  seatMarginDb,
  seatState,
} from "@/core/reach";
import { classifyNoise } from "@/core/room";

describe("reach model", () => {
  it("needs 8, 13 and 19 dB over the noise in babble, 5 dB less in a steady hum", () => {
    expect(requiredSnr("well")).toBe(8);
    expect(requiredSnr("some")).toBe(13);
    expect(requiredSnr("alot")).toBe(19);
    expect(requiredSnr("well", "steady")).toBe(3);
    expect(requiredSnr("alot", "quiet")).toBe(19);
  });

  it("reproduces the worked values", () => {
    expect(reachM(62, 50, "well", 6)).toBeCloseTo(1.587, 2);
    expect(reachM(62, 50, "well", 5)).toBeCloseTo(1.741, 3);
    expect(reachM(62, 55, "well", 5)).toBeCloseTo(0.871, 3);
    expect(reachM(66, 50, "well", 5)).toBeCloseTo(3.03, 2);
    expect(reachM(58, 50, "alot", 5)).toBe(0.3);
    expect(reachM(90, 30, "well", 5)).toBe(6);
  });

  it("halves per 5 dB of noise and grows 1.74 times per 4 dB of voice", () => {
    expect(reachM(62, 55, "well") / reachM(62, 50, "well")).toBeCloseTo(0.5, 6);
    expect(reachM(66, 50, "well") / reachM(62, 50, "well")).toBeCloseTo(1.741, 3);
    expect(reachFactor(4)).toBeCloseTo(1.741, 3);
  });

  it("falls alpha dB per doubling of distance", () => {
    expect(levelAtDistance(62, 1)).toBe(62);
    expect(levelAtDistance(62, 2)).toBe(57);
    expect(levelAtDistance(62, 4)).toBe(52);
  });

  it("prices the room's noise against a quiet room", () => {
    expect(noiseCostM(60, 50, "well")).toBeCloseTo(
      reachM(60, 40, "well") - reachM(60, 50, "well"),
      9,
    );
    expect(noiseCostM(60, 40, "well")).toBe(0);
  });

  it("decides which seats are in reach for their own class", () => {
    const reach = reachAll(62, 50);
    const seats = [
      newListener("a", "Ana", "well", "L1"),
      newListener("b", "Jane", "some", "L3"),
      newListener("c", "Tom", "well", "R3"),
    ];
    expect(inReach(seats, reach)).toEqual(["a"]);
    expect(inReach(seats, reachAll(66, 50))).toEqual(["a", "c"]);
  });

  it("gives each seat a three-state word from its own margin", () => {
    expect(seatState(3)).toBe("hears");
    expect(seatState(0)).toBe("straining");
    expect(seatState(-3)).toBe("far");
    const margin = seatMarginDb(62, 50, { hearing: "well", distanceM: 2 });
    expect(margin).toBeCloseTo(-1, 6);
    expect(seatState(margin)).toBe("straining");
  });
});

describe("listeners", () => {
  it("makes initials and trims labels", () => {
    expect(initials("Jane")).toBe("J");
    expect(initials("grandpa Joe")).toBe("GJ");
    expect(initials("Mary Ann Smith")).toBe("MS");
    expect(initials("   ")).toBe("?");
    expect(newListener("x", "  A very long name indeed  ", "well", "L1").label).toBe(
      "A very long na",
    );
    expect(HEARING_LABEL.alot).toContain("Hearing aids");
  });
});

describe("room and clarity", () => {
  it("classifies the room from its level and modulation", () => {
    expect(classifyNoise(30, 0.9)).toBe("quiet");
    expect(classifyNoise(52, 0.6)).toBe("voices");
    expect(classifyNoise(52, 0.1)).toBe("steady");
  });

  it("measures clarity as the band difference in dB", () => {
    expect(clarityDb(-30, -36)).toBe(-6);
  });
});
