"use client";

import { useNow } from "@/hooks/useNow";

function clock(now: number): string {
  const d = new Date(now);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The drawn phone's status bar: the real time, full signal, full battery. */
export function StatusBar() {
  const now = useNow(15_000);
  return (
    <div className="hi-statusbar" aria-hidden>
      <span className="hi-statusbar__time">{now === null ? "" : clock(now)}</span>
      <span className="hi-statusbar__icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="0.9" />
          <rect x="5" y="5" width="3" height="7" rx="0.9" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="0.9" />
          <rect x="15" y="0" width="3" height="12" rx="0.9" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.3-1.3A10.3 10.3 0 0 0 8 .6C5.2.6 2.6 1.7.7 3.5L2 4.8a8.5 8.5 0 0 1 6-2.4Z" />
          <path d="M8 6c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.6 6.6 0 0 0 8 4.2c-1.8 0-3.5.7-4.7 1.8l1.3 1.3C5.5 6.5 6.7 6 8 6Z" />
          <path d="M8 9.6c.5 0 .9.2 1.2.5L8 11.4l-1.2-1.3c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="12"
            rx="3.6"
            stroke="currentColor"
            opacity="0.4"
          />
          <rect x="2" y="2" width="20" height="9" rx="2.2" fill="currentColor" />
          <path d="M25 4.4v4.2a2.2 2.2 0 0 0 0-4.2Z" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}
