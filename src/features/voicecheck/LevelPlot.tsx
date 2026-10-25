import type { SelfTestSentence } from "@/core/types";
import { levelPlotLayout, type PlotRow } from "./plot";

const X0 = 14;
const X1 = 326;

/**
 * The check's ten sentences as two rows of dots on one decibel axis, without
 * the chatter above, with it below. Each row names its average, so the
 * comparison reads from the words as well as from the dots.
 */
export function LevelPlot({
  sentences,
  offsetDb,
}: {
  sentences: readonly SelfTestSentence[];
  offsetDb: number;
}) {
  const layout = levelPlotLayout(
    sentences.map((s) => ({ boosted: s.boosted, dba: s.leqDb + offsetDb })),
    X0,
    X1,
  );
  const avg = (row: PlotRow) => (row.meanDba === null ? "" : `, ${Math.round(row.meanDba)} dBA`);
  return (
    <svg
      className="hi-plot"
      viewBox="0 0 340 140"
      role="img"
      aria-label={`Without the chatter your voice averaged${avg(layout.without)}; with it${avg(layout.with)}.`}
    >
      <Row
        row={layout.without}
        y={44}
        label={`Without chatter${avg(layout.without)}`}
        tone="plain"
      />
      <Row row={layout.with} y={100} label={`With chatter${avg(layout.with)}`} tone="voice" />
      <text className="hi-plot__axis" x={X0} y="138" textAnchor="start">
        {layout.lo} dBA
      </text>
      <text className="hi-plot__axis" x={X1} y="138" textAnchor="end">
        {layout.hi} dBA
      </text>
    </svg>
  );
}

function Row({
  row,
  y,
  label,
  tone,
}: {
  row: PlotRow;
  y: number;
  label: string;
  tone: "plain" | "voice";
}) {
  return (
    <g data-tone={tone}>
      <text className="hi-plot__label" x={X0} y={y - 22}>
        {label}
      </text>
      <line className="hi-plot__track" x1={X0} y1={y} x2={X1} y2={y} />
      {row.dots.map((dot, i) => (
        <circle key={i} className="hi-plot__dot" cx={dot.x} cy={y + dot.dy} r="7" />
      ))}
      {row.meanX === null ? null : (
        <line className="hi-plot__mean" x1={row.meanX} y1={y - 14} x2={row.meanX} y2={y + 14} />
      )}
    </g>
  );
}
