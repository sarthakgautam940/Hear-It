"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every `everyMs` while mounted; null until the first client render. */
export function useNow(everyMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

/** "4:07" or "1:02:45" since `since`, ticking each second. */
export function useElapsed(since: number | null): string {
  const now = useNow(1000);
  if (since === null || now === null) return "0:00";
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
