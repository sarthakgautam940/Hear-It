/*
  The voice check's picture of speech and chatter. The table itself, the app's
  main picture, lives in features/talk.
*/

/* Speech as bursts of bars, and chatter under a burst only when it played. */
interface Burst {
  x: number;
  heights: readonly number[];
  chatter: boolean;
}

function Speech({
  bursts,
  barW,
  barStep,
  label,
}: {
  bursts: readonly Burst[];
  barW: number;
  barStep: number;
  label: string;
}) {
  return (
    <svg className="hi-scene hi-scene--speech" viewBox="0 0 300 120" role="img" aria-label={label}>
      <text x="0" y="38" fontSize="16" fontWeight="650" fill="var(--text-2)">
        You
      </text>
      <text x="0" y="102" fontSize="16" fontWeight="650" fill="var(--text-2)">
        Chatter
      </text>
      {bursts.map((burst) => {
        const width = (burst.heights.length - 1) * barStep + barW;
        return (
          <g key={burst.x}>
            {burst.heights.map((h, i) => (
              <rect
                key={i}
                x={burst.x + i * barStep}
                y={32 - h / 2}
                width={barW}
                height={h}
                rx={barW / 2}
                fill="var(--text-2)"
              />
            ))}
            {burst.chatter ? (
              <rect
                x={burst.x - 3}
                y="86"
                width={width + 6}
                height="22"
                rx="6"
                fill="var(--marigold)"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* Ten sentences, chatter under five of them, drawn at random once to show the shape of the check. */
const CHECK_HEIGHTS = [
  [10, 22, 16, 8],
  [14, 26, 20, 10],
  [8, 18, 24, 12],
  [12, 28, 18, 8],
  [10, 20, 26, 14],
  [16, 24, 12, 8],
  [8, 22, 28, 16],
  [12, 18, 22, 10],
  [10, 26, 20, 12],
  [14, 20, 16, 8],
] as const;
const CHECK_DRAW = [false, true, true, false, true, false, false, true, false, true];
const CHECK_BURSTS: readonly Burst[] = CHECK_HEIGHTS.map((heights, i) => ({
  x: 76 + i * 22.6,
  heights,
  chatter: CHECK_DRAW[i] ?? false,
}));

export function CheckScene() {
  return (
    <Speech
      bursts={CHECK_BURSTS}
      barW={2.5}
      barStep={4.5}
      label="Ten sentences in a row; chatter plays under five of them, chosen at random."
    />
  );
}
