/** Two arcs of reach over a voice: the mark, drawn in the current text colour. */
export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="16" cy="25" r="2.8" fill="currentColor" stroke="none" />
      <path d="M9.5 18.5a9.2 9.2 0 0 1 13 0" />
      <path d="M5.2 14.2a15.3 15.3 0 0 1 21.6 0" />
    </svg>
  );
}
