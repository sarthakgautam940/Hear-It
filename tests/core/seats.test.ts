import { describe, expect, it } from "vitest";
import { newListener, seatsTaken } from "@/core/listeners";
import {
  SEAT_SLOTS,
  freeSeat,
  seatDistanceM,
  seatEveryone,
  seatName,
  seatSide,
} from "@/core/seats";

describe("the chairs at the table", () => {
  it("puts each chair where it stands on an eight-seat table", () => {
    expect(seatDistanceM("L1")).toBeCloseTo(0.96, 2);
    expect(seatDistanceM("L2")).toBeCloseTo(1.63, 2);
    expect(seatDistanceM("L3")).toBeCloseTo(2.39, 2);
    expect(seatDistanceM("H")).toBe(3);
  });

  it("is the same distance from you on either side", () => {
    for (const rank of ["1", "2", "3"]) {
      expect(seatDistanceM(`L${rank}` as "L1")).toBe(seatDistanceM(`R${rank}` as "R1"));
    }
  });

  it("fills nearest first, alternating sides, the far head last", () => {
    expect(SEAT_SLOTS).toEqual(["L1", "R1", "L2", "R2", "L3", "R3", "H"]);
    expect(freeSeat([])).toBe("L1");
    expect(freeSeat(["L1", "R1"])).toBe("L2");
    expect(freeSeat(SEAT_SLOTS)).toBeNull();
  });

  it("names each chair in words", () => {
    expect(seatName("L1")).toBe("On your left, next to you");
    expect(seatName("R2")).toBe("On your right, halfway down");
    expect(seatName("H")).toBe("At the head of the table, facing you");
    expect(seatSide("H")).toBe("head");
  });
});

describe("seating people saved before chairs existed", () => {
  it("keeps the chairs people hold and gives the rest the free chair nearest their distance", () => {
    const seated = seatEveryone([
      { id: "a", distanceM: 1, seat: "L1" as const },
      { id: "b", distanceM: 1 },
      { id: "c", distanceM: 2.5 },
    ]);
    expect(seated.map((p) => p.seat)).toEqual(["L1", "R1", "L3"]);
  });

  it("never seats two people in one chair", () => {
    const seated = seatEveryone([
      { id: "a", distanceM: 1.5, seat: "L2" as const },
      { id: "b", distanceM: 1.5, seat: "L2" as const },
    ]);
    expect(new Set(seated.map((p) => p.seat)).size).toBe(2);
    expect(seated[0]?.seat).toBe("L2");
  });

  it("lists the chairs everyone else sits in", () => {
    const people = [newListener("a", "Ana", "well", "L1"), newListener("b", "Tom", "well", "H")];
    expect([...seatsTaken(people, "a").entries()]).toEqual([["H", "Tom"]]);
    expect(newListener("c", "Jo", "some", "R3").distanceM).toBeCloseTo(2.39, 2);
  });
});
