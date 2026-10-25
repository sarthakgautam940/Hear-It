import type { DecorKind } from "../table";
import { ART, DETAIL, LINE } from "./palette";

/* What sits down the middle of the table, each drawn around its own center. */

export function Decor({ kind, x, y }: { kind: DecorKind; x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>{DRAW[kind]}</g>;
}

const LEAVES = [34, 156, 262];
const BLOOMS: ReadonlyArray<{ x: number; y: number; r: number; petal: string; heart: string }> = [
  { x: -6, y: -6, r: 10, petal: ART.porcelain, heart: ART.terracotta },
  { x: 9, y: -2.5, r: 8.6, petal: ART.rose, heart: ART.burgundy },
  { x: -1.5, y: 10, r: 8.6, petal: ART.porcelain, heart: ART.terracotta },
];

function Flowers() {
  return (
    <g>
      {LEAVES.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path
            d="M8 0C13 -5.6 21 -5.4 26 0C21 5.4 13 5.6 8 0Z"
            fill={ART.oat}
            stroke={ART.ink}
            strokeWidth={LINE}
            strokeLinejoin="round"
          />
          <path d="M10 0H23.5" stroke={ART.ink} strokeWidth={DETAIL} strokeLinecap="round" />
        </g>
      ))}
      {BLOOMS.map((b) => (
        <g key={`${b.x}${b.y}`} transform={`translate(${b.x} ${b.y})`}>
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse
              key={i}
              cx={b.r * 0.56}
              cy={0}
              rx={b.r * 0.5}
              ry={b.r * 0.34}
              transform={`rotate(${i * 60 + b.x * 3})`}
              fill={b.petal}
              stroke={ART.ink}
              strokeWidth={DETAIL}
            />
          ))}
          <circle r={b.r * 0.3} fill={b.heart} stroke={ART.ink} strokeWidth={DETAIL} />
        </g>
      ))}
      <circle cx={13} cy={11} r={2.6} fill={ART.terracotta} stroke={ART.ink} strokeWidth={DETAIL} />
      <circle cx={-14.5} cy={6} r={2.4} fill={ART.rose} stroke={ART.ink} strokeWidth={DETAIL} />
    </g>
  );
}

function Bread() {
  return (
    <g>
      <rect
        x={-14}
        y={-30}
        width={28}
        height={60}
        rx={6}
        fill={ART.wood}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <path
        d="M-9 -24V24M9 -24V24"
        stroke={ART.woodDark}
        strokeWidth={DETAIL}
        strokeLinecap="round"
      />
      <ellipse
        cx={0}
        cy={-2}
        rx={9.6}
        ry={20}
        fill={ART.crust}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <path
        d="M-5.5 -12.5L5 -15.5M-6.4 -4.5L5.8 -7.6M-6 3.5L5.6 0.4M-5 11L4.6 8.2"
        stroke={ART.crustDark}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <rect
        x={-6.5}
        y={21}
        width={13}
        height={6}
        rx={2.5}
        fill={ART.wheat}
        stroke={ART.ink}
        strokeWidth={DETAIL}
      />
    </g>
  );
}

function Pot() {
  return (
    <g>
      <rect
        x={-23}
        y={-6}
        width={46}
        height={12}
        rx={4}
        fill={ART.terracotta}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <circle r={17.5} fill={ART.terracotta} stroke={ART.ink} strokeWidth={LINE} />
      <circle r={13.6} fill="none" stroke={ART.ink} strokeWidth={DETAIL} />
      <circle r={4.4} fill={ART.charcoal} stroke={ART.ink} strokeWidth={DETAIL} />
      <path
        d="M-9.6 -6.8A11.6 11.6 0 0 1 -4.4 -10.8"
        fill="none"
        stroke={ART.porcelain}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A roast chicken on a platter, legs toward you, with roast carrots round it. */
function Roast() {
  const legs = "M-4.5 9C-7 13 -7.5 17 -5.4 19.6M4.5 9C7 13 7.5 17 5.4 19.6";
  return (
    <g>
      <ellipse cx={0.9} cy={1.6} rx={17} ry={28} fill={ART.shadow} />
      <ellipse rx={17} ry={28} fill={ART.porcelain} stroke={ART.ink} strokeWidth={LINE} />
      {[
        [-10, -15],
        [9.8, -13.4],
        [-10.8, 13],
        [10.2, 15],
      ].map(([x, y]) => (
        <ellipse
          key={`${x}${y}`}
          cx={x}
          cy={y}
          rx={3.4}
          ry={1.9}
          transform={`rotate(${(x ?? 0) * 6} ${x} ${y})`}
          fill={ART.terracotta}
          stroke={ART.ink}
          strokeWidth={DETAIL}
        />
      ))}
      <g fill="none" strokeLinecap="round">
        <path d={legs} stroke={ART.ink} strokeWidth={6.4} />
        <path d={legs} stroke={ART.crust} strokeWidth={4} />
      </g>
      <circle
        cx={-5.4}
        cy={20.4}
        r={1.9}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={DETAIL}
      />
      <circle
        cx={5.4}
        cy={20.4}
        r={1.9}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={DETAIL}
      />
      <path
        d="M-9 -2C-12.5 -5 -12 -9.6 -8.8 -11.2M9 -2C12.5 -5 12 -9.6 8.8 -11.2"
        fill={ART.crust}
        stroke={ART.ink}
        strokeWidth={LINE}
        strokeLinejoin="round"
      />
      <path
        d="M0 -15.5C7.5 -15.5 10.5 -8 10.5 0C10.5 8 6 12.5 0 12.5C-6 12.5 -10.5 8 -10.5 0C-10.5 -8 -7.5 -15.5 0 -15.5Z"
        fill={ART.crust}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <path
        d="M0 -11V8.5M-5.6 -7.4C-4.4 -3 -4.4 2.4 -5.6 6.4M5.6 -7.4C4.4 -3 4.4 2.4 5.6 6.4"
        fill="none"
        stroke={ART.crustDark}
        strokeWidth={DETAIL}
        strokeLinecap="round"
      />
    </g>
  );
}

const DRAW: Record<DecorKind, React.ReactNode> = {
  flowers: <Flowers />,
  roast: <Roast />,
  bread: <Bread />,
  pot: <Pot />,
};
