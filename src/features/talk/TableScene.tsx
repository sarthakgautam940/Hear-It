import type { SeatState } from "@/core/reach";
import { seatSide, type SeatSlot } from "@/core/seats";
import { Decor } from "./art/Middle";
import { ART, LINE } from "./art/palette";
import { EmptyChair, LOOKS, STORY_LOOKS, SeatAbove, SeatBelow, YOUR_LOOK } from "./art/Person";
import { Plant } from "./art/Room";
import { FOODS, PlaceSetting, type MatTone } from "./art/Setting";
import {
  HEAD_OUT,
  OPEN_CHAIRS,
  placeNames,
  placeTableSeats,
  seatPoint,
  setTheMiddle,
  turnToYou,
  type TableGeometry,
  type TableSeat,
} from "./table";

/** How far each person glances when nobody is talking, so the table looks lived in. */
const AT_EASE = [-6, 5, -3, 8, -8, 3];
/** Someone straining turns an ear toward you, not their face. */
const STRAIN_TURN = 0.28;
/** Someone who cannot hear you carries on, looking a little away. */
const AWAY_TURN = -10;
/** At the head of the table, someone who cannot hear you looks across to a neighbor. */
const HEAD_AWAY_TURN = -28;
/** Heads turn one after another, nearest first, as your voice travels up the table. */
const TURN_STAGGER_MS = 120;

const MAT: Record<SeatState, MatTone> = { hears: "voice", straining: "soft", far: "plain" };

/** Moves a figure drawn facing +x into its chair: down a side, or at the head facing you. */
function frame(g: TableGeometry, slot: SeatSlot): string {
  const { x, y } = seatPoint(g, slot);
  const s = g.scale;
  switch (seatSide(slot)) {
    case "left":
      return `translate(${x} ${y}) scale(${s})`;
    case "right":
      return `translate(${x} ${y}) scale(${-s} ${s})`;
    case "head":
      return `translate(${x} ${y}) rotate(90) scale(${s})`;
  }
}

/**
 * The table, drawn: you at the near end and everyone else in their chairs, with
 * their places set. An empty table shows a few chairs pushed in, each with a sign
 * to sit there. When someone can hear you they turn to face you and their mat
 * turns marigold; someone straining cups an ear.
 */
export function TableScene({
  g,
  seats,
  description,
  fresh = [],
  named = true,
}: {
  g: TableGeometry;
  seats: readonly TableSeat[];
  description: string;
  /** People just added, who take their seats as they appear. */
  fresh?: readonly string[];
  /** Writes each name beside its place; off where a list beside the picture names everyone. */
  named?: boolean;
}) {
  const placed = placeTableSeats(g, seats);
  const empties = placed.length === 0 ? OPEN_CHAIRS : [];
  const added = new Map(seats.map((s, i) => [s.id, i]));
  const names = named ? placeNames(g, placed) : [];
  const middle = setTheMiddle(g, names, new Map(placed.map((p) => [p.id, p.label])));
  const you = `translate(${g.mid} ${g.clothBottom + HEAD_OUT}) rotate(-90)`;
  const clothW = g.clothRight - g.clothLeft;
  const clothH = g.clothBottom - g.clothTop;

  const people = placed.map((seat, rank) => {
    const i = added.get(seat.id) ?? rank;
    const head = seat.side === "head";
    const turn =
      seat.state === "hears"
        ? turnToYou(g, seat)
        : seat.state === "straining"
          ? turnToYou(g, seat) * STRAIN_TURN
          : seat.state === "far"
            ? head
              ? HEAD_AWAY_TURN
              : AWAY_TURN
            : (AT_EASE[i % AT_EASE.length] ?? 0);
    return {
      seat,
      look: STORY_LOOKS[seat.id] ?? LOOKS[i % LOOKS.length]!,
      food: FOODS[i % FOODS.length]!,
      wine: i % 2 === 1,
      mat: seat.state ? MAT[seat.state] : ("plain" as const),
      turn,
      delay: rank * TURN_STAGGER_MS,
      frame: frame(g, seat.seat),
    };
  });

  return (
    <svg
      className="hi-tm__svg"
      viewBox={`0 0 ${g.width} ${g.height}`}
      width={g.width}
      height={g.height}
      role="img"
      aria-label={description}
    >
      <Plant x={g.width - 24} y={g.height - 28} />
      <rect
        x={g.clothLeft + 4}
        y={g.clothTop + 8}
        width={clothW}
        height={clothH}
        rx={12}
        fill={ART.shadow}
      />
      {empties.map((slot) => (
        <g key={slot} transform={frame(g, slot)}>
          <EmptyChair />
        </g>
      ))}
      {people.map((p) => (
        <g key={p.seat.id} transform={p.frame}>
          <SeatBelow />
        </g>
      ))}
      <g transform={you}>
        <SeatBelow />
      </g>

      <rect
        x={g.clothLeft}
        y={g.clothTop}
        width={clothW}
        height={clothH}
        rx={12}
        fill={ART.cloth}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      {middle.map((item) => (
        <Decor key={item.kind} kind={item.kind} x={g.mid} y={item.y} />
      ))}

      {people.map((p) => (
        <g key={p.seat.id} transform={p.frame}>
          <PlaceSetting food={p.food} wine={p.wine} mat={p.mat} delay={p.delay} />
        </g>
      ))}
      <g transform={you}>
        <PlaceSetting food="roast" wine={false} mat="voice" />
      </g>

      {people.map((p) => (
        <g key={p.seat.id} transform={p.frame}>
          <g className={fresh.includes(p.seat.id) ? "hi-art__arrive" : undefined}>
            <SeatAbove
              look={p.look}
              turn={p.turn}
              pose={p.seat.state === "straining" ? "cup" : "rest"}
              delay={p.delay}
              aids={p.seat.hearing === "alot"}
            />
          </g>
        </g>
      ))}
      <g transform={you}>
        <SeatAbove look={YOUR_LOOK} turn={0} />
      </g>
      {empties.map((slot) => (
        <g key={slot} transform={frame(g, slot)}>
          <AddBadge />
        </g>
      ))}

      {names.map((n) => (
        <text key={n.id} className="hi-tm__label hi-tm__name" x={n.x} y={n.y} textAnchor={n.anchor}>
          {placed.find((p) => p.id === n.id)?.label}
        </text>
      ))}
      <text className="hi-tm__label hi-tm__name" x={g.mid + 42} y={g.youY + 6}>
        You
      </text>
    </svg>
  );
}

/** The sign on an empty chair that someone can sit here: ink, like every other action. */
function AddBadge() {
  return (
    <g transform="translate(-13 0)">
      <circle r={15} fill={ART.ink} stroke={ART.porcelain} strokeWidth={2} />
      <path d="M-6 0H6M0 -6V6" stroke={ART.porcelain} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}
