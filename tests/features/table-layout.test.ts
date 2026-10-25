import { describe, expect, it } from "vitest";
import { TABLE_LENGTH_M, type SeatSlot } from "@/core/seats";
import {
  CHAIR_LANE,
  DECOR_HALF_WIDTH,
  DECOR_SPAN,
  FAR_FLOOR,
  FAR_ROOM,
  MAX_TURN_DEG,
  MIN_FIGURE_SCALE,
  NAME_ABOVE,
  NAME_BELOW,
  NEAR_ROOM,
  nameWidth,
  placeNames,
  placeTableSeats,
  setTheMiddle,
  tableGeometry,
  turnToYou,
  type TableSeat,
} from "@/features/talk/table";

const seat = (id: string, slot: SeatSlot, label = id): TableSeat => ({
  id,
  label,
  hearing: "well",
  seat: slot,
  state: null,
});

describe("table geometry", () => {
  it("keeps chair lanes on both sides, room for you below and for the far head above", () => {
    const g = tableGeometry(354, 460, 10);
    expect(g.clothLeft).toBe(CHAIR_LANE);
    expect(g.clothRight).toBe(354 - CHAIR_LANE);
    expect(g.clothTop).toBe(10 + FAR_FLOOR);
    expect(tableGeometry(354, 460, 10, true).clothTop).toBe(10 + FAR_ROOM);
    expect(g.clothBottom).toBe(460 - NEAR_ROOM);
    expect(g.pxPerM).toBeCloseTo((g.clothBottom - g.clothTop) / TABLE_LENGTH_M, 6);
  });

  it("draws people full size on a tall table and smaller, within a floor, on a short one", () => {
    expect(tableGeometry(354, 460).scale).toBe(1);
    const short = tableGeometry(300, 260);
    expect(short.scale).toBeLessThan(1);
    expect(short.scale).toBeGreaterThanOrEqual(MIN_FIGURE_SCALE);
  });
});

describe("the chairs", () => {
  const g = tableGeometry(354, 460, 10);

  it("seats each person in their own chair, nearest first", () => {
    const placed = placeTableSeats(g, [seat("h", "H"), seat("a", "L1"), seat("b", "R2")]);
    expect(placed.map((p) => p.id)).toEqual(["a", "b", "h"]);
    const [a, b, h] = placed;
    expect(a!.x).toBeLessThan(g.clothLeft);
    expect(b!.x).toBeGreaterThan(g.clothRight);
    expect(h!.x).toBe(g.mid);
    expect(h!.y).toBeLessThan(g.clothTop);
  });

  it("puts nearer chairs nearer your end, down both sides alike", () => {
    const placed = placeTableSeats(g, [
      seat("l1", "L1"),
      seat("l2", "L2"),
      seat("l3", "L3"),
      seat("r1", "R1"),
    ]);
    const y = (id: string) => placed.find((p) => p.id === id)!.y;
    expect(y("l1")).toBeGreaterThan(y("l2"));
    expect(y("l2")).toBeGreaterThan(y("l3"));
    expect(y("r1")).toBe(y("l1"));
  });

  it("turns people farther up the table further round, never past the shoulder, and not at the head", () => {
    const placed = placeTableSeats(g, [
      seat("a", "L1"),
      seat("b", "L2"),
      seat("c", "L3"),
      seat("h", "H"),
    ]);
    const turns = placed.map((p) => turnToYou(g, p));
    expect(turns[1]!).toBeGreaterThan(turns[0]!);
    expect(turns[2]!).toBeGreaterThan(turns[1]!);
    for (const t of turns) expect(t).toBeLessThanOrEqual(MAX_TURN_DEG);
    expect(turns[3]).toBe(0);
  });
});

describe("names on the cloth", () => {
  const g = tableGeometry(354, 460, 10);

  it("writes short names across a row on one line", () => {
    const placed = placeTableSeats(g, [seat("a", "L2", "Ana"), seat("b", "R2", "Tom")]);
    const [a, b] = placeNames(g, placed);
    expect(a!.y).toBe(b!.y);
  });

  it("steps two long names on one row apart so they never share a line", () => {
    const placed = placeTableSeats(g, [
      seat("a", "L2", "Grandpa Joseph"),
      seat("b", "R2", "Aunt Marianne"),
    ]);
    const [a, b] = placeNames(g, placed);
    expect(Math.abs(a!.y - b!.y)).toBeGreaterThanOrEqual(18);
  });

  it("keeps the names nearest you off your own place", () => {
    const placed = placeTableSeats(g, [seat("a", "L1", "Shalav"), seat("b", "R1", "Freddy")]);
    for (const n of placeNames(g, placed)) expect(n.y).toBeLessThanOrEqual(g.clothBottom - 50);
  });
});

describe("the middle of the table", () => {
  const g = tableGeometry(354, 460, 10);

  it("sets flowers first, and everything when nobody is seated", () => {
    const kinds = setTheMiddle(g, [], new Map()).map((i) => i.kind);
    expect(kinds[0]).toBe("flowers");
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("never puts a dish across a name that reaches the middle, or off the cloth", () => {
    const placed = placeTableSeats(g, [
      seat("a", "L1", "Grandpa Joseph"),
      seat("b", "R2", "Aunt Marianne"),
      seat("c", "L3", "Bea"),
    ]);
    const names = placeNames(g, placed);
    const labels = new Map(placed.map((p) => [p.id, p.label]));
    for (const item of setTheMiddle(g, names, labels)) {
      const top = item.y - DECOR_SPAN[item.kind] / 2;
      const bottom = item.y + DECOR_SPAN[item.kind] / 2;
      expect(top).toBeGreaterThanOrEqual(g.clothTop);
      expect(bottom).toBeLessThanOrEqual(g.clothBottom);
      for (const n of names) {
        const w = nameWidth(labels.get(n.id)!);
        const [from, to] = n.anchor === "start" ? [n.x, n.x + w] : [n.x - w, n.x];
        const reaches = to > g.mid - DECOR_HALF_WIDTH && from < g.mid + DECOR_HALF_WIDTH;
        if (reaches) {
          const clear = bottom <= n.y - NAME_ABOVE || top >= n.y + NAME_BELOW;
          expect(clear).toBe(true);
        }
      }
    }
  });
});
