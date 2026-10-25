import { ART, DETAIL, LINE } from "./palette";

/*
  A place at the table, in the same frame as the person who sits at it: facing
  +x, the table's edge at x = 16, the plate's center at (40, 0). The mat under
  the plate is where the voice shows: marigold when that person hears you.
*/

export type Food = "pasta" | "roast" | "salmon" | "pie";
export const FOODS: readonly Food[] = ["pasta", "roast", "salmon", "pie"];

export type MatTone = "plain" | "voice" | "soft";

const PLATE = { x: 40, r: 15.5, well: 10.8 };
const MAT = { x: 19, w: 43, h: 62 };
const FRINGE = Array.from({ length: 13 }, (_, i) => MAT.x + 3 + i * 3.1);

const MAT_FILL: Record<MatTone, string> = {
  plain: ART.mat,
  voice: ART.voice,
  soft: ART.voiceSoft,
};

export function PlaceSetting({
  food,
  wine,
  mat,
  set = false,
  delay = 0,
}: {
  food: Food;
  wine: boolean;
  mat: MatTone;
  /** A place nobody sits at yet: the napkin still folded on the plate. */
  set?: boolean;
  /** The mat lights in turn with its person, as the voice travels up the table. */
  delay?: number;
}) {
  return (
    <g>
      <Mat tone={mat} delay={delay} />
      <Fork />
      <Knife />
      <circle cx={PLATE.x + 0.8} cy={1.4} r={PLATE.r} fill={ART.shadow} />
      <circle
        cx={PLATE.x}
        cy={0}
        r={PLATE.r}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={LINE}
      />
      <circle
        cx={PLATE.x}
        cy={0}
        r={PLATE.well}
        fill={ART.glaze}
        stroke={ART.clothLine}
        strokeWidth={DETAIL}
      />
      {set ? <Napkin /> : <Dish food={food} />}
      <Glass wine={wine && !set} />
    </g>
  );
}

function Mat({ tone, delay }: { tone: MatTone; delay: number }) {
  const half = MAT.h / 2;
  return (
    <g>
      <path
        d={FRINGE.map((x) => `M${x} ${-half - 3.6}V${-half}M${x} ${half}V${half + 3.6}`).join("")}
        stroke={ART.matLine}
        strokeWidth={DETAIL}
        strokeLinecap="round"
      />
      <rect
        className="hi-art__mat"
        x={MAT.x}
        y={-half}
        width={MAT.w}
        height={MAT.h}
        rx={3}
        style={{ fill: MAT_FILL[tone], transitionDelay: `${delay}ms` }}
        stroke={ART.ink}
        strokeWidth={1.25}
      />
      <rect
        x={MAT.x + 3.5}
        y={-half + 3.5}
        width={MAT.w - 7}
        height={MAT.h - 7}
        rx={1.5}
        fill="none"
        stroke={ART.matLine}
        strokeWidth={DETAIL}
      />
    </g>
  );
}

function Fork() {
  return (
    <g stroke={ART.ink} strokeLinecap="round" fill="none">
      <path d="M22 -23H39" strokeWidth={2.2} />
      <path d="M39 -23H42.5M42.5 -25.2V-20.8" strokeWidth={DETAIL} />
      <path d="M42.5 -25.2H49M42.5 -23H49M42.5 -20.8H49" strokeWidth={DETAIL} />
    </g>
  );
}

function Knife() {
  return (
    <g>
      <path d="M22 23H33" stroke={ART.ink} strokeWidth={2.6} strokeLinecap="round" />
      <path
        d="M33 21.7L50.5 21.9Q53.6 23 50.5 24.6L33 24.4Z"
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={DETAIL}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Glass({ wine }: { wine: boolean }) {
  const x = 60;
  const y = 18;
  return (
    <g>
      <circle cx={x + 0.7} cy={y + 1.2} r={6.4} fill={ART.shadow} />
      <circle cx={x} cy={y} r={6.4} fill={ART.glass} stroke={ART.ink} strokeWidth={1.25} />
      {wine ? <circle cx={x} cy={y} r={4.3} fill={ART.burgundy} /> : null}
      <path
        d={`M${x - 3.6} ${y - 1.6}A4 4 0 0 1 ${x - 1.2} ${y - 3.8}`}
        fill="none"
        stroke={ART.porcelain}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </g>
  );
}

function Napkin() {
  const x = PLATE.x;
  return (
    <g transform={`rotate(45 ${x} 0)`}>
      <rect
        x={x - 7.5}
        y={-7.5}
        width={15}
        height={15}
        rx={1.5}
        fill={ART.porcelain}
        stroke={ART.ink}
        strokeWidth={1.25}
      />
      <rect
        x={x - 5}
        y={-5}
        width={10}
        height={10}
        fill="none"
        stroke={ART.terracotta}
        strokeWidth={DETAIL}
      />
      <path
        d={`M${x - 7.5} ${7.5}L${x + 7.5} ${-7.5}`}
        stroke={ART.clothLine}
        strokeWidth={DETAIL}
      />
    </g>
  );
}

function Dish({ food }: { food: Food }) {
  const x = PLATE.x;
  switch (food) {
    case "pasta":
      return (
        <g>
          <circle cx={x} cy={0} r={8.2} fill={ART.wheat} stroke={ART.ink} strokeWidth={1.25} />
          <path
            d={`M${x - 6} -2.5C${x - 3} -6 ${x + 3} -6.5 ${x + 5.5} -2M${x - 6.4} 2C${x - 2} -1 ${x + 3} 6 ${x + 6} 1.5M${x - 4} 5.5C${x - 1} 3 ${x + 2} 7.4 ${x + 4.6} 4.8M${x - 3.6} -5C${x} -3 ${x + 1} 3 ${x + 4} 5`}
            fill="none"
            stroke={ART.crustDark}
            strokeWidth={DETAIL}
            strokeLinecap="round"
          />
          <circle
            cx={x + 0.6}
            cy={-0.4}
            r={3.4}
            fill={ART.terracotta}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
        </g>
      );
    case "roast":
      return (
        <g>
          <path
            d={`M${x - 7.5} -1.5C${x - 9} -6 ${x - 3} -8.6 ${x + 1} -5.6L${x + 5.4} -2.4C${x + 7.2} -1.2 ${x + 6.6} 1.4 ${x + 4.6} 1.2L${x - 1} 2.6C${x - 4.4} 3.6 ${x - 7} 2 ${x - 7.5} -1.5Z`}
            fill={ART.crust}
            stroke={ART.ink}
            strokeWidth={1.25}
            strokeLinejoin="round"
          />
          <circle
            cx={x + 6.4}
            cy={-0.6}
            r={1.9}
            fill={ART.porcelain}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
          <circle
            cx={x - 3.4}
            cy={6}
            r={3.2}
            fill={ART.cream}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
          <circle
            cx={x + 2.8}
            cy={6.6}
            r={3.2}
            fill={ART.cream}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
          <circle
            cx={x + 7}
            cy={4}
            r={2}
            fill={ART.terracotta}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
        </g>
      );
    case "salmon":
      return (
        <g>
          <ellipse
            cx={x - 2.4}
            cy={4.6}
            rx={6.4}
            ry={3.8}
            fill={ART.cream}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
          <g transform={`rotate(-24 ${x + 1} -2)`}>
            <rect
              x={x - 6}
              y={-6.2}
              width={14}
              height={8.4}
              rx={3}
              fill={ART.coral}
              stroke={ART.ink}
              strokeWidth={1.25}
            />
            <path
              d={`M${x - 2.6} -6V2M${x + 1} -6V2M${x + 4.6} -6V2`}
              stroke={ART.porcelain}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          </g>
        </g>
      );
    case "pie":
      return (
        <g>
          <path
            d={`M${x - 7} 6.6L${x + 1.4} -8.4C${x + 5.2} -6.4 ${x + 8} -2.4 ${x + 8.4} 2.6Z`}
            fill={ART.wheat}
            stroke={ART.ink}
            strokeWidth={1.25}
            strokeLinejoin="round"
          />
          <path
            d={`M${x + 1.4} -8.4C${x + 5.2} -6.4 ${x + 8} -2.4 ${x + 8.4} 2.6`}
            fill="none"
            stroke={ART.crust}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <path
            d={`M${x - 2} 1.8L${x + 3} -3.2M${x + 1.2} 3.6L${x + 5.2} -0.6`}
            stroke={ART.crustDark}
            strokeWidth={DETAIL}
            strokeLinecap="round"
          />
          <circle
            cx={x - 4.6}
            cy={-3.6}
            r={2.4}
            fill={ART.porcelain}
            stroke={ART.ink}
            strokeWidth={DETAIL}
          />
        </g>
      );
  }
}
