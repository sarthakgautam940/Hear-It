import { useId } from "react";
import { ART, DETAIL, HAIR, LINE, SKIN } from "./palette";

/*
  A person at the table, seen from above. Every part is drawn facing +x, with
  the head's center at the origin and the table's edge 16 points ahead; the
  scene turns and mirrors the whole figure into each seat. The chair sits
  under the table's edge, so it is drawn before the cloth; the body, arms and
  head rest over the edge, so they are drawn after it.
*/

export type HairStyle = "short" | "bob" | "bun" | "crown" | "curls" | "tail";

export interface Look {
  skin: string;
  hair: HairStyle;
  hairColor: { fill: string; line: string };
  top: string;
  stripes?: boolean;
  scarf?: boolean;
  glasses?: boolean;
}

/** People take these in the order they were added; none of them says who someone is. */
export const LOOKS: readonly Look[] = [
  { skin: SKIN.fair, hair: "short", hairColor: HAIR.white, top: ART.terracotta, glasses: true },
  { skin: SKIN.deep, hair: "curls", hairColor: HAIR.black, top: ART.oat, stripes: true },
  { skin: SKIN.warm, hair: "bob", hairColor: HAIR.silver, top: ART.burgundy },
  { skin: SKIN.tan, hair: "crown", hairColor: HAIR.gray, top: ART.stone, glasses: true },
  { skin: SKIN.fair, hair: "tail", hairColor: HAIR.auburn, top: ART.rose },
  { skin: SKIN.warm, hair: "short", hairColor: HAIR.chestnut, top: ART.charcoal, scarf: true },
];

/** The welcome's three guests, drawn to suit their names. */
export const STORY_LOOKS: Readonly<Record<string, Look>> = {
  ana: { skin: SKIN.warm, hair: "bob", hairColor: HAIR.silver, top: ART.burgundy },
  jane: { skin: SKIN.deep, hair: "bun", hairColor: HAIR.gray, top: ART.oat, stripes: true },
  tom: {
    skin: SKIN.fair,
    hair: "crown",
    hairColor: HAIR.white,
    top: ART.terracotta,
    glasses: true,
  },
};

export const YOUR_LOOK: Look = {
  skin: SKIN.warm,
  hair: "short",
  hairColor: HAIR.silver,
  top: ART.charcoal,
};

export type Pose = "rest" | "cup";

const SLEEVE = 8.5;

/* Shoulders seen from above: wide, shallow, rounder at the back than the chest. */
const TORSO =
  "M4 -19C6 -10 6 10 4 19C3 24.5 -1 27 -7 27L-13 27C-19.5 27 -23 22.5 -23 14L-23 -14C-23 -22.5 -19.5 -27 -13 -27L-7 -27C-1 -27 3 -24.5 4 -19Z";

/* Forearms run forward from the shoulders and rest on the table either side of the plate. */
const ARM_UP = "M-3 -23.5C6 -26.5 14 -21 21 -14";
const ARM_DOWN = "M-3 23.5C6 26.5 14 21 21 14";
/* The near arm lifted, the elbow forward, the hand cupped behind the ear. */
const ARM_CUP = "M-3 23.5Q14 34 -1.5 17.5";

/** The chair someone sits on, mostly hidden under them. */
export function SeatBelow() {
  return <Chair />;
}

function Chair() {
  return (
    <g>
      <rect
        x={-37}
        y={-24}
        width={40}
        height={48}
        rx={7}
        fill={ART.wood}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <rect
        x={-33.5}
        y={-20.5}
        width={33}
        height={41}
        rx={5}
        fill={ART.cushion}
        stroke={ART.ink}
        strokeWidth={DETAIL}
      />
      <circle cx={-17} cy={0} r={1.5} fill={ART.ink} />
      <rect
        x={-44}
        y={-26}
        width={8.5}
        height={52}
        rx={4.25}
        fill={ART.woodDark}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <path d="M-39.75 -19V19" stroke={ART.wood} strokeWidth={DETAIL} strokeLinecap="round" />
    </g>
  );
}

/** An empty chair, pushed in under the table's edge and left a little crooked. */
export function EmptyChair() {
  return (
    <g transform="translate(4 0) rotate(-5 -17 0)">
      <Chair />
    </g>
  );
}

function Arm({ d, top }: { d: string; top: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={ART.ink} strokeWidth={SLEEVE + 2 * LINE} />
      <path d={d} stroke={top} strokeWidth={SLEEVE} />
    </g>
  );
}

function Hand({ x, y, angle, skin }: { x: number; y: number; angle: number; skin: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <ellipse rx={5.2} ry={4} fill={skin} stroke={ART.ink} strokeWidth={LINE} />
      <path
        d="M2.4 -2.2Q4.2 -0.6 2.8 1.6"
        fill="none"
        stroke={ART.ink}
        strokeWidth={DETAIL}
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * The body, arms and head. `turn` is how far the head turns from looking across
 * the table, in degrees, positive toward the near end. A cupped hand goes to the
 * ear nearer to you.
 */
export function SeatAbove({
  look,
  turn,
  pose = "rest",
  delay = 0,
  aids = false,
}: {
  look: Look;
  turn: number;
  pose?: Pose;
  delay?: number;
  /** Hearing aids behind both ears, for someone who said they use them. */
  aids?: boolean;
}) {
  const clip = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cup = pose === "cup";
  return (
    <g>
      <Arm d={ARM_UP} top={look.top} />
      <Hand x={22.8} y={-12.2} angle={45} skin={look.skin} />
      <g className="hi-art__fade" style={{ opacity: cup ? 0 : 1 }}>
        <Arm d={ARM_DOWN} top={look.top} />
        <Hand x={22.8} y={12.2} angle={-45} skin={look.skin} />
      </g>
      <path d={TORSO} fill={look.top} stroke={ART.ink} strokeWidth={LINE} />
      {look.stripes ? (
        <g>
          <clipPath id={clip}>
            <path d={TORSO} />
          </clipPath>
          <path
            d="M-16.5 -30V30M-10.5 -30V30M-4.5 -30V30"
            clipPath={`url(#${clip})`}
            stroke={ART.terracotta}
            strokeWidth={1.6}
          />
        </g>
      ) : null}
      {look.scarf ? <Scarf /> : null}
      <g
        className="hi-art__head"
        style={{ transform: `rotate(${turn}deg)`, transitionDelay: `${delay}ms` }}
      >
        <Head look={look} aids={aids} />
      </g>
      <g className="hi-art__fade" style={{ opacity: cup ? 1 : 0 }}>
        <Arm d={ARM_CUP} top={look.top} />
        <Hand x={-3.2} y={15.7} angle={-133} skin={look.skin} />
      </g>
    </g>
  );
}

function Scarf() {
  const wrap = "M3 -12.5C-5 -17.5 -16.5 -13 -16.5 0C-16.5 13 -5 17.5 3 12.5";
  const tail = "M-12 9.5L-19.5 19";
  return (
    <g fill="none" strokeLinecap="round">
      <path d={wrap} stroke={ART.ink} strokeWidth={5 + 2 * LINE} />
      <path d={tail} stroke={ART.ink} strokeWidth={5 + 2 * LINE} />
      <path d={wrap} stroke={ART.terracotta} strokeWidth={5} />
      <path d={tail} stroke={ART.terracotta} strokeWidth={5} />
    </g>
  );
}

function Head({ look, aids }: { look: Look; aids: boolean }) {
  const hair = look.hairColor;
  const ears = look.hair !== "bob";
  return (
    <g>
      {ears ? (
        <g fill={look.skin} stroke={ART.ink} strokeWidth={LINE}>
          <ellipse cx={-0.5} cy={-11.3} rx={2.8} ry={3.3} />
          <ellipse cx={-0.5} cy={11.3} rx={2.8} ry={3.3} />
        </g>
      ) : null}
      <ellipse
        cx={13.6}
        cy={0}
        rx={3.1}
        ry={2.5}
        fill={look.skin}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <ellipse rx={13.5} ry={11.5} fill={look.skin} stroke={ART.ink} strokeWidth={LINE} />
      <path
        d="M7.8 -7Q10.4 -5.6 10.8 -2.4M7.8 7Q10.4 5.6 10.8 2.4"
        fill="none"
        stroke={ART.ink}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <Hair style={look.hair} fill={hair.fill} line={hair.line} />
      {look.glasses ? (
        <path
          d="M-0.5 -11L10 -8.4Q12.8 0 10 8.4L-0.5 11"
          fill="none"
          stroke={ART.ink}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      ) : null}
      {aids ? <HearingAids /> : null}
    </g>
  );
}

/** Behind-the-ear aids, each with its thin tube over the top of the ear. */
function HearingAids() {
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          <path
            d={`M-3.6 ${12.6 * s}Q-1 ${16.4 * s} 1.6 ${13.4 * s}`}
            fill="none"
            stroke={ART.ink}
            strokeWidth={DETAIL}
            strokeLinecap="round"
          />
          <ellipse
            cx={-5.4}
            cy={13.2 * s}
            rx={3.4}
            ry={1.9}
            transform={`rotate(${-24 * s} -5.4 ${13.2 * s})`}
            fill={ART.stone}
            stroke={ART.ink}
            strokeWidth={LINE}
          />
        </g>
      ))}
    </g>
  );
}

/* The hair over the back and top of the head, leaving the forehead, brows and nose to show which way a person faces. */
const SHORT =
  "M-0.5 -11.6C3.5 -8.5 5.6 -3.5 5.6 0C5.6 3.5 3.5 8.5 -0.5 11.6C-6 13.2 -12.4 11.4 -14.2 6.2C-15.4 2.4 -15.4 -2.4 -14.2 -6.2C-12.4 -11.4 -6 -13.2 -0.5 -11.6Z";

function Hair({ style, fill, line }: { style: HairStyle; fill: string; line: string }) {
  const shape = { fill, stroke: ART.ink, strokeWidth: LINE, strokeLinejoin: "round" as const };
  const strands = {
    fill: "none",
    stroke: line,
    strokeWidth: DETAIL,
    strokeLinecap: "round" as const,
  };
  switch (style) {
    case "short":
      return (
        <g>
          <path d={SHORT} {...shape} />
          <path
            d="M-7 0.4C-3 -3 0.6 -5.6 3.4 -7.6M-7 0.4C-2.6 -0.4 1 -0.8 4.6 -1.2M-7 0.4C-2.6 2 0.8 4.6 3.4 7.6M-7 0.4C-9.8 -3.4 -10.8 -6.6 -10.2 -9.6M-7 0.4C-9.8 4 -10.8 7 -10.2 9.8M-7 0.4C-10.2 0 -12.2 0.6 -13.8 1.6"
            {...strands}
          />
        </g>
      );
    case "bob":
      return (
        <g>
          <path
            d="M4.5 -12.4C8.2 -6.4 8.2 6.4 4.5 12.4C0.6 16 -9.8 16 -14.6 10C-17.4 5.4 -17.4 -5.4 -14.6 -10C-9.8 -16 0.6 -16 4.5 -12.4Z"
            {...shape}
          />
          <path
            d="M6.6 -3.6C-0.6 -4 -8 -2.8 -15.6 -1.4M3.6 -10.6C-2 -12.8 -9 -12 -13.4 -7.6M3.6 10.6C-2 12.8 -9 12 -13.4 7.6M6.4 3.8C-0.6 5.4 -8 7 -14.6 5.6"
            {...strands}
          />
        </g>
      );
    case "bun":
      return (
        <g>
          <path d={SHORT} {...shape} />
          <path
            d="M3 -7.6C-2 -6.8 -8 -4.4 -13.2 -1.6M5 0C-1 -0.4 -7 -0.4 -13.2 0M3 7.6C-2 6.8 -8 4.4 -13.2 1.6"
            {...strands}
          />
          <circle cx={-16.6} cy={0} r={5.6} {...shape} />
          <path d="M-16.6 -2.8A2.8 2.8 0 1 1 -19.4 0" {...strands} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path
            d="M1.2 -11.6C-6 -13.8 -14 -10.8 -14.9 -4.6L-14.9 4.6C-14 10.8 -6 13.8 1.2 11.6L0.8 8.2C-5 9.6 -10.6 7.2 -11.2 3.2L-11.2 -3.2C-10.6 -7.2 -5 -9.6 0.8 -8.2Z"
            {...shape}
          />
          <path
            d="M-3.6 -10.4L-4.4 -12.6M-8.2 -8.8L-9.6 -10.8M-12 -5.6L-13.6 -6.8M-12.4 0H-14.4M-12 5.6L-13.6 6.8M-8.2 8.8L-9.6 10.8M-3.6 10.4L-4.4 12.6"
            {...strands}
          />
          <path
            d="M-4.6 -3.4A6 6 0 0 1 1.2 -5.6"
            fill="none"
            stroke={ART.porcelain}
            strokeWidth={1.3}
            strokeLinecap="round"
            opacity={0.7}
          />
        </g>
      );
    case "curls":
      return (
        <g>
          <path d={CURLS} {...shape} />
          <path
            d="M-7.6 -5.6a2.2 2.2 0 1 1 3 1.4M-10.6 2a2.2 2.2 0 1 1 3 1.4M-3.6 5.8a2.2 2.2 0 1 1 3 1.4M-4.4 -1.2a2.2 2.2 0 1 1 3 1.4M-1.6 -7.6a2.2 2.2 0 1 1 3 1.4"
            {...strands}
          />
        </g>
      );
    case "tail":
      return (
        <g>
          <path
            d="M-12.4 -3.6C-18.4 -5.6 -22.4 -2 -26.6 -4.6C-24.6 0 -21.6 3.6 -25.6 6.2C-20.4 6.6 -17.4 3.6 -12.4 3.6Z"
            {...shape}
          />
          <path d={SHORT} {...shape} />
          <path
            d="M3 -7.6C-2 -6.8 -8 -4.4 -13.2 -1.6M5 0C-1 -0.4 -7 -0.4 -13.2 0M3 7.6C-2 6.8 -8 4.4 -13.2 1.6M-16.6 -1.6C-19.4 -2 -21.6 -1 -23.4 -1.8M-16.6 1.6C-19.4 2.2 -21.4 3.4 -23 4.6"
            {...strands}
          />
          <rect
            x={-15.6}
            y={-3.4}
            width={3.2}
            height={6.8}
            rx={1.6}
            fill={ART.terracotta}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
        </g>
      );
  }
}

/** Curly hair: a scalloped edge round the back of the head, open over the face. */
const CURLS = (() => {
  const rx = 14.6;
  const ry = 12.8;
  const from = 82;
  const to = 278;
  const steps = 11;
  const at = (deg: number, k = 1): [number, number] => {
    const r = (deg * Math.PI) / 180;
    return [rx * k * Math.cos(r), ry * k * Math.sin(r)];
  };
  const fmt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  let d = `M${fmt(at(from))}`;
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const b = from + ((to - from) * (i + 1)) / steps;
    d += `Q${fmt(at((a + b) / 2, 1.2))} ${fmt(at(b))}`;
  }
  d += `Q7.4 0 ${fmt(at(from))}Z`;
  return d;
})();
