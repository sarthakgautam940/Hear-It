"use client";

import { useSyncExternalStore } from "react";

const never = () => () => undefined;

/** False on the server and during hydration, true after: for what only the browser can know. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}
