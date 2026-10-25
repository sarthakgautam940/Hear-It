import type { SeatState } from "@/core/reach";
import {
  SEAT_SLOTS,
  SIDE_ALONG_M,
  TABLE_LENGTH_M,
  seatRank,
  seatSide,
  type SeatSide,
  type SeatSlot,
} from "@/core/seats";
import type { Hearing } from "@/core/types";

/*
  The table drawn from above. You sit at the near end; the others sit in the
  chairs of an eight-seat table, each chair where it really stands, so the
  length of the table runs to scale. Its width is a picture, not a measurement:
  wide enough to write each person's name beside their place.
*/

export interface TableSeat {
  id: string;
  label: string;
  hearing: Hearing;
  seat: SeatSlot;
  state: SeatState | null;
}

export interface PlacedTableSeat extends TableSeat {
  side: SeatSide;
  /** The person's head: just off the cloth's edge, over the front of their chair. */
  x: number;
  y: number;
}

export interface TableGeometry {
  width: number;
  height: number;
  clothLeft: number;
  clothRight: number;
  clothTop: number;
  clothBottom: number;
  /** Center of your plate at the near end. */
  youY: number;
  mid: number;
  pxPerM: number;
  /** How large people are drawn: full size unless the chairs down a side would touch. */
  scale: number;
  /** Someone sits at the far head of the table, so the far end keeps room for them. */
  head: boolean;
}

/** An empty table shows these chairs open, each with a sign to sit there: two down your left, one on your right. */
export const OPEN_CHAIRS: readonly SeatSlot[] = ["L1", "R2", "L3"];

/** Room on each long side for a seated person and their chair. */
export const CHAIR_LANE = 60;
/** Room under the near end for you and your chair. */
export const NEAR_ROOM = 64;
/** Room over the far end for whoever sits at its head, or a little floor when nobody does. */
export const FAR_ROOM = 52;
export const FAR_FLOOR = 24;
/** A seated head sits this far outside the cloth's edge, over the front of the chair. */
export const HEAD_OUT = 16;
/** Your plate's center sits this far up from the near edge of the cloth. */
const YOU_INSET = 24;
/** A person drawn at full size needs this much of their side of the table. */
export const FIGURE_SPAN = 66;
/** On a short table people are drawn smaller, but never below this. */
export const MIN_FIGURE_SCALE = 0.7;
/** Past this a person would turn their shoulders as well as their head. */
export const MAX_TURN_DEG = 78;

export function tableGeometry(
  width: number,
  height: number,
  top = 10,
  head = false,
): TableGeometry {
  const clothTop = top + (head ? FAR_ROOM : FAR_FLOOR);
  const clothBottom = height - NEAR_ROOM;
  const pxPerM = Math.max((clothBottom - clothTop) / TABLE_LENGTH_M, 0);
  const spacing = ((SIDE_ALONG_M[1] ?? 0) - (SIDE_ALONG_M[0] ?? 0)) * pxPerM;
  return {
    width,
    height,
    clothLeft: CHAIR_LANE,
    clothRight: width - CHAIR_LANE,
    clothTop,
    clothBottom,
    youY: clothBottom - YOU_INSET,
    mid: width / 2,
    pxPerM,
    scale: Math.min(1, Math.max(MIN_FIGURE_SCALE, spacing / FIGURE_SPAN)),
    head,
  };
}

/** Where a chair puts its sitter's head. */
export function seatPoint(g: TableGeometry, slot: SeatSlot): { x: number; y: number } {
  const side = seatSide(slot);
  const out = HEAD_OUT * g.scale;
  if (side === "head") return { x: g.mid, y: g.clothTop - out };
  const y = g.clothBottom - (SIDE_ALONG_M[seatRank(slot)] ?? 0) * g.pxPerM;
  return { x: side === "left" ? g.clothLeft - out : g.clothRight + out, y };
}

/** Everyone at their chair, nearest first. */
export function placeTableSeats(g: TableGeometry, seats: readonly TableSeat[]): PlacedTableSeat[] {
  return [...seats]
    .sort((a, b) => SEAT_SLOTS.indexOf(a.seat) - SEAT_SLOTS.indexOf(b.seat))
    .map((seat) => ({ ...seat, side: seatSide(seat.seat), ...seatPoint(g, seat.seat) }));
}

/** Your head, centered at the near end. */
export function yourHead(g: TableGeometry): { x: number; y: number } {
  return { x: g.mid, y: g.clothBottom + HEAD_OUT };
}

/**
 * How far someone turns their head to face you, in degrees from looking straight
 * across the table, positive toward the near end. People near you turn a little,
 * people at the far end turn almost to their shoulder; whoever sits at the head
 * of the table already faces you.
 */
export function turnToYou(g: TableGeometry, seat: PlacedTableSeat): number {
  if (seat.side === "head") return 0;
  const you = yourHead(g);
  const deg = (Math.atan2(you.y - seat.y, Math.abs(you.x - seat.x)) * 180) / Math.PI;
  return Math.min(Math.max(deg, 0), MAX_TURN_DEG);
}

/* Names are written on the cloth beside each place, one line each. */
const NAME_PX = 17;
/** A rough width for a name in the drawing's type, so names can keep clear of each other. */
export function nameWidth(label: string): number {
  return label.length * 0.6 * NAME_PX;
}
/** From the cloth's edge to where a side seat's name starts, past the plate and glass. */
export const NAME_INSET = 58;

/** A name blocked where it would go steps this far up the table, a few times at most. */
export const NAME_STEP = 11;
const NAME_TRIES = 4;
/** Names keep this much space either side, so two never read as one. */
const NAME_GAP = 14;
/** A name's box around its baseline. */
const NAME_ASCENT = 14;
const NAME_DESCENT = 4;
/** Your place at the near end, with the word "You" beside it: names keep off it. */
const YOUR_PLACE_TOP = 50;
const YOUR_PLACE_REACH = 80;

export interface NamePlace {
  id: string;
  x: number;
  /** Baseline. */
  y: number;
  anchor: "start" | "end";
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Where each name goes: beside its place, nearest people first. A name that would
 * touch your own place or a name already written steps up the table until it is
 * clear, so names never run together or into your plate.
 */
export function placeNames(g: TableGeometry, placed: readonly PlacedTableSeat[]): NamePlace[] {
  const inset = NAME_INSET * g.scale;
  const written: Box[] = [
    {
      left: g.mid - 38,
      right: g.mid + YOUR_PLACE_REACH,
      top: g.clothBottom - YOUR_PLACE_TOP,
      bottom: g.clothBottom,
    },
  ];
  return placed.map((p) => {
    const w = nameWidth(p.label);
    const anchor: NamePlace["anchor"] = p.side === "right" ? "end" : "start";
    const x =
      p.side === "head"
        ? g.mid + 42 * g.scale
        : p.side === "left"
          ? g.clothLeft + inset
          : g.clothRight - inset;
    const [from, to] = anchor === "start" ? [x, x + w] : [x - w, x];
    const boxAt = (y: number): Box => ({
      left: from - NAME_GAP,
      right: to + NAME_GAP,
      top: y - NAME_ASCENT,
      bottom: y + NAME_DESCENT,
    });
    let y = p.side === "head" ? g.clothTop + 30 * g.scale : p.y + 6;
    for (let i = 0; i < NAME_TRIES && written.some((b) => overlaps(b, boxAt(y))); i++) {
      y -= NAME_STEP;
    }
    written.push(boxAt(y));
    return { id: p.id, x, y, anchor };
  });
}

export type DecorKind = "flowers" | "roast" | "bread" | "pot";

export interface DecorItem {
  kind: DecorKind;
  /** Center, on the table's middle line. */
  y: number;
}

/** How much of the middle line each thing needs, its own length plus a little air. */
export const DECOR_SPAN: Record<DecorKind, number> = { flowers: 58, roast: 64, bread: 66, pot: 46 };
const DECOR_ORDER: readonly DecorKind[] = ["flowers", "roast", "bread", "pot"];
/** Half the width of the middle line the dishes sit on. */
export const DECOR_HALF_WIDTH = 30;
/** A name's band on the middle line, around its baseline. */
export const NAME_ABOVE = 18;
export const NAME_BELOW = 8;
/** The places at the two heads of the table. */
const HEAD_PLACE = 64;
const YOUR_PLACE = 50;

/**
 * Sets the middle of the table with what fits between the names that cross it:
 * flowers first, then the roast, the bread and a pot, each in the first open
 * stretch from the far end that holds it, spaced evenly within that stretch.
 */
export function setTheMiddle(
  g: TableGeometry,
  names: readonly NamePlace[],
  labels: ReadonlyMap<string, string>,
): DecorItem[] {
  const crosses = (n: NamePlace) => {
    const w = nameWidth(labels.get(n.id) ?? "");
    const [from, to] = n.anchor === "start" ? [n.x, n.x + w] : [n.x - w, n.x];
    return to > g.mid - DECOR_HALF_WIDTH && from < g.mid + DECOR_HALF_WIDTH;
  };
  const blocked = names
    .filter(crosses)
    .map((n) => [n.y - NAME_ABOVE, n.y + NAME_BELOW] as const)
    .concat(g.head ? [[g.clothTop, g.clothTop + HEAD_PLACE * g.scale] as const] : [])
    .concat([[g.clothBottom - YOUR_PLACE, g.clothBottom] as const])
    .sort((a, b) => a[0] - b[0]);
  const runs: { from: number; to: number; items: DecorKind[] }[] = [];
  let cursor = g.clothTop;
  for (const [from, to] of blocked) {
    if (from > cursor) runs.push({ from: cursor, to: from, items: [] });
    cursor = Math.max(cursor, to);
  }
  const used = (run: (typeof runs)[number]) => run.items.reduce((sum, k) => sum + DECOR_SPAN[k], 0);
  for (const kind of DECOR_ORDER) {
    const run = runs.find((r) => r.to - r.from - used(r) >= DECOR_SPAN[kind]);
    if (run) run.items.push(kind);
  }
  return runs.flatMap((run) => {
    const spare = (run.to - run.from - used(run)) / (run.items.length + 1);
    let y = run.from;
    return run.items.map((kind) => {
      y += spare + DECOR_SPAN[kind] / 2;
      const item = { kind, y };
      y += DECOR_SPAN[kind] / 2;
      return item;
    });
  });
}
