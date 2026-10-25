import { ART, DETAIL, LINE } from "./palette";

/* The room round the table: a plant in the corner the controls leave free. */

const LEAF_ANGLES = [-150, -100, -40, 20, 75, 135];

export function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={1.5} cy={2.5} r={13} fill={ART.shadow} />
      <circle r={13} fill={ART.terracotta} stroke={ART.ink} strokeWidth={LINE} />
      <circle r={10} fill={ART.soil} stroke={ART.ink} strokeWidth={DETAIL} />
      {LEAF_ANGLES.map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <path
            d={`M3 0C9 ${-7 - (i % 2)} ${22 + (i % 3) * 2} -7 ${28 + (i % 3) * 2} 0C${22 + (i % 3) * 2} 7 9 ${7 + (i % 2)} 3 0Z`}
            fill={ART.oat}
            stroke={ART.ink}
            strokeWidth={LINE}
            strokeLinejoin="round"
          />
          <path
            d={`M5 0H${25 + (i % 3) * 2}M13 0L17 -4M13 0L17 4M19 0L22.5 -3.2M19 0L22.5 3.2`}
            stroke={ART.ink}
            strokeWidth={DETAIL}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}
