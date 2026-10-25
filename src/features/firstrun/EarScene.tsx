import type { EarMode } from "@/core/types";
import { ART } from "@/features/talk/art/palette";
import { YOUR_LOOK } from "@/features/talk/art/Person";

/*
  You at the table, close up and from above, with the earbud in the ear you
  chose. It is the table's drawing of you redrawn for this size: the shapes keep
  the figure's frame (facing +x, the head's center at the origin, the table's
  edge 16 ahead, the plate at 40), but every line is set in screen pixels, so
  the close-up is as fine as the table it comes from rather than its lines
  enlarged. There is no chair; your back runs on past the bottom of the card.
*/

const W = 354;
const H = 300;
const HEAD = { x: W / 2, y: 172 };
const ZOOM = 3.3;

/** A line weight in screen pixels, inside the enlarged frame. */
const px = (w: number) => w / ZOOM;
const OUTLINE = px(1.6);
const FINE = px(1.05);

const SLEEVE = 8.5;
const ARM_LEFT = "M-3 -23.5C6 -26.5 14 -21 21 -14";
const ARM_RIGHT = "M-3 23.5C6 26.5 14 21 21 14";

/* The shoulders and back from above, running on past the bottom of the picture. */
const TORSO =
  "M4 -19C6 -10 6 10 4 19C3 24.5 -1 27 -7 27L-50 29.5L-50 -29.5L-7 -27C-1 -27 3 -24.5 4 -19Z";

/* Short hair over the back and top of the head, leaving the forehead and brows. */
const HAIR =
  "M-0.5 -11.6C3.5 -8.5 5.6 -3.5 5.6 0C5.6 3.5 3.5 8.5 -0.5 11.6C-6 13.2 -12.4 11.4 -14.2 6.2C-15.4 2.4 -15.4 -2.4 -14.2 -6.2C-12.4 -11.4 -6 -13.2 -0.5 -11.6Z";

/*
  Strands run from the crown toward the hairline, longer to the front than the
  back and unevenly spaced, each bowed the same way so the hair turns about the
  crown the way it grows.
*/
const STRANDS = (() => {
  const crown = { x: -7.6, y: 0.6 };
  const ends: readonly [number, number][] = [
    [3, -7.6],
    [4.9, -3.4],
    [4.7, 1.4],
    [3.4, 6.8],
    [-1.6, 10.6],
    [-8.6, 10.4],
    [-13.2, 4.6],
    [-13, -3.4],
    [-9.8, -9.8],
    [-3.6, -11],
  ];
  const f = (n: number) => n.toFixed(2);
  return ends
    .map(([x, y]) => {
      const dx = x - crown.x;
      const dy = y - crown.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      const bow = 0.14 * length;
      const sx = crown.x + ux * 1.2;
      const sy = crown.y + uy * 1.2;
      const cx = (sx + x) / 2 + uy * bow;
      const cy = (sy + y) / 2 - ux * bow;
      return `M${f(sx)} ${f(sy)}Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
    })
    .join("");
})();

const FRINGE = Array.from({ length: 13 }, (_, i) => 22 + i * 3.1);

function Table() {
  return (
    <g>
      <rect x={13.6} y={-60} width={2.4} height={120} fill={ART.shadow} />
      <rect x={16} y={-60} width={50} height={120} fill={ART.cloth} />
      <path d="M16 -60V60" stroke={ART.ink} strokeWidth={OUTLINE} />
      <path
        d={FRINGE.map((x) => `M${x} -34.6V-31M${x} 31V34.6`).join("")}
        stroke={ART.matLine}
        strokeWidth={FINE}
        strokeLinecap="round"
      />
      <rect
        x={19}
        y={-31}
        width={43}
        height={62}
        rx={3}
        fill={ART.voice}
        stroke={ART.ink}
        strokeWidth={OUTLINE}
      />
      <rect
        x={22.5}
        y={-27.5}
        width={36}
        height={55}
        rx={1.5}
        fill="none"
        stroke={ART.matLine}
        strokeWidth={FINE}
      />
      <g stroke={ART.ink} strokeLinecap="round" fill="none">
        <path d="M23 -23H38.6" strokeWidth={1.8} />
        <path d="M38.6 -23H42.4" strokeWidth={px(2.4)} />
        <path d="M42.4 -25.4V-20.6" strokeWidth={px(1.6)} />
        <path
          d="M42.4 -25.4H48.8M42.4 -23.8H48.8M42.4 -22.2H48.8M42.4 -20.6H48.8"
          strokeWidth={px(1.3)}
        />
        <path d="M23 23H33" strokeWidth={2.2} />
      </g>
      <path
        d="M33 21.7L50.5 21.9Q53.6 23 50.5 24.6L33 24.4Z"
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={px(1.3)}
        strokeLinejoin="round"
      />
      <circle cx={39} cy={0.8} r={15.5} fill={ART.shadow} />
      <circle cx={40} cy={0} r={15.5} fill={ART.porcelain} stroke={ART.ink} strokeWidth={OUTLINE} />
      <circle cx={40} cy={0} r={10.8} fill={ART.glaze} stroke={ART.clothLine} strokeWidth={FINE} />
      <Roast />
    </g>
  );
}

/** A roast leg with potatoes and a carrot, as the table serves it, with its crust drawn in. */
function Roast() {
  const x = 40;
  return (
    <g strokeLinejoin="round">
      <path
        d={`M${x - 7.5} -1.5C${x - 9} -6 ${x - 3} -8.6 ${x + 1} -5.6L${x + 5.4} -2.4C${x + 7.2} -1.2 ${x + 6.6} 1.4 ${x + 4.6} 1.2L${x - 1} 2.6C${x - 4.4} 3.6 ${x - 7} 2 ${x - 7.5} -1.5Z`}
        fill={ART.crust}
        stroke={ART.ink}
        strokeWidth={OUTLINE}
      />
      <path
        d={`M${x - 5.8} -3.4Q${x - 3.6} -5.4 ${x - 0.6} -4.4M${x - 5} -0.2Q${x - 2.2} -1.6 ${x + 1.4} -1.8M${x + 1.6} -3.6Q${x + 3} -2.6 ${x + 3.6} -1.6`}
        fill="none"
        stroke={ART.crustDark}
        strokeWidth={FINE}
        strokeLinecap="round"
      />
      <circle
        cx={x + 6.4}
        cy={-0.6}
        r={1.9}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={FINE}
      />
      <circle cx={x - 3.4} cy={6} r={3.2} fill={ART.cream} stroke={ART.ink} strokeWidth={FINE} />
      <circle cx={x + 2.8} cy={6.6} r={3.2} fill={ART.cream} stroke={ART.ink} strokeWidth={FINE} />
      <circle cx={x + 7} cy={4} r={2} fill={ART.terracotta} stroke={ART.ink} strokeWidth={FINE} />
    </g>
  );
}

function Arm({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={ART.ink} strokeWidth={SLEEVE + 2 * OUTLINE} />
      <path d={d} stroke={YOUR_LOOK.top} strokeWidth={SLEEVE} />
    </g>
  );
}

function Hand({ y, angle }: { y: number; angle: number }) {
  return (
    <g transform={`translate(22.8 ${y}) rotate(${angle})`}>
      <ellipse rx={5.2} ry={4} fill={YOUR_LOOK.skin} stroke={ART.ink} strokeWidth={OUTLINE} />
      <path
        d="M2.4 -2.2Q4.2 -0.6 2.8 1.6"
        fill="none"
        stroke={ART.ink}
        strokeWidth={FINE}
        strokeLinecap="round"
      />
    </g>
  );
}

function Head() {
  const hair = YOUR_LOOK.hairColor;
  return (
    <g>
      <g fill={YOUR_LOOK.skin} stroke={ART.ink} strokeWidth={OUTLINE}>
        <ellipse cx={-0.5} cy={-11.3} rx={2.8} ry={3.3} />
        <ellipse cx={-0.5} cy={11.3} rx={2.8} ry={3.3} />
      </g>
      <path
        d="M-2.3 -12.5Q-0.5 -14.1 1.3 -12.5M-2.3 12.5Q-0.5 14.1 1.3 12.5"
        fill="none"
        stroke={ART.ink}
        strokeWidth={FINE}
        strokeLinecap="round"
      />
      <ellipse
        cx={13.6}
        cy={0}
        rx={3.1}
        ry={2.5}
        fill={YOUR_LOOK.skin}
        stroke={ART.ink}
        strokeWidth={OUTLINE}
      />
      <ellipse rx={13.5} ry={11.5} fill={YOUR_LOOK.skin} stroke={ART.ink} strokeWidth={OUTLINE} />
      <path
        d="M7.8 -7Q10.4 -5.6 10.8 -2.4M7.8 7Q10.4 5.6 10.8 2.4"
        fill="none"
        stroke={ART.ink}
        strokeWidth={px(2.4)}
        strokeLinecap="round"
      />
      <path
        d={HAIR}
        fill={hair.fill}
        stroke={ART.ink}
        strokeWidth={OUTLINE}
        strokeLinejoin="round"
      />
      <path d={STRANDS} fill="none" stroke={hair.line} strokeWidth={FINE} strokeLinecap="round" />
    </g>
  );
}

/**
 * An earbud in the ear on side -1 (left) or 1 (right): the bud sits in the ear
 * and its stem, which hangs down along the jaw, shows from above as running
 * forward beside the cheek.
 */
function Earbud({ side }: { side: -1 | 1 }) {
  const y = 12.6 * side;
  return (
    <g className="hi-fr__bud">
      <g transform={`rotate(${8 * side} 0.4 ${y})`}>
        <rect
          x={0.4}
          y={y - 1.1}
          width={6.4}
          height={2.2}
          rx={1.1}
          fill={ART.porcelain}
          stroke={ART.ink}
          strokeWidth={px(1.4)}
        />
        <circle cx={5.6} cy={y} r={0.55} fill={ART.stone} />
      </g>
      <ellipse
        cx={-0.5}
        cy={y}
        rx={2.7}
        ry={2.3}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={px(1.4)}
      />
      <ellipse cx={0.7} cy={y - 0.9 * side} rx={0.85} ry={0.45} fill={ART.charcoal} />
    </g>
  );
}

export function EarScene({ ear }: { ear: EarMode }) {
  const sides: (-1 | 1)[] = ear === "both" ? [-1, 1] : ear === "left" ? [-1] : [1];
  const label = {
    left: "You at the table, seen from above, with one earbud in your left ear.",
    right: "You at the table, seen from above, with one earbud in your right ear.",
    both: "You at the table, seen from above, with an earbud in each ear.",
  }[ear];
  return (
    <svg
      className="hi-fr__scene"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
    >
      <g transform={`translate(${HEAD.x} ${HEAD.y}) rotate(-90) scale(${ZOOM})`}>
        <Table />
        <Arm d={ARM_LEFT} />
        <Hand y={-12.2} angle={45} />
        <Arm d={ARM_RIGHT} />
        <Hand y={12.2} angle={-45} />
        <path d={TORSO} fill={YOUR_LOOK.top} stroke={ART.ink} strokeWidth={OUTLINE} />
        <Head />
        {sides.map((s) => (
          <Earbud key={s} side={s} />
        ))}
      </g>
    </svg>
  );
}
