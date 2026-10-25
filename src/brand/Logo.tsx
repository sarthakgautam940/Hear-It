import { MARK, WORDMARK } from "./marks";

/* The logo is always one ink: it takes the color of the text around it. */
export function Mark({ height = 32, title }: { height?: number; title?: string }) {
  const width = (MARK.width / MARK.height) * height;
  return (
    <svg
      viewBox={MARK.viewBox}
      width={width}
      height={height}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
    >
      <path d={MARK.path} />
      <circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} />
    </svg>
  );
}

export function Wordmark({ height = 28, title = "Hear It" }: { height?: number; title?: string }) {
  const width = (WORDMARK.width / WORDMARK.height) * height;
  return (
    <svg
      viewBox={WORDMARK.viewBox}
      width={width}
      height={height}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      <path d={WORDMARK.path} />
      <circle cx={WORDMARK.dot.cx} cy={WORDMARK.dot.cy} r={WORDMARK.dot.r} />
    </svg>
  );
}

/** The app icon as drawn on a home screen: the mark in espresso on a lamplight tile. */
export function AppIcon({ size = 64 }: { size?: number }) {
  const markHeight = size * 0.54;
  const markWidth = (MARK.width / MARK.height) * markHeight;
  const scale = markHeight / MARK.height;
  const x = (size - markWidth) / 2;
  const y = (size - markHeight) / 2 - size * 0.02;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
      <rect width={size} height={size} rx={size * 0.225} fill="#fbac55" />
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#2b190d">
        <path d={MARK.path} />
        <circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} />
      </g>
    </svg>
  );
}
