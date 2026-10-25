"use client";

import { useSyncExternalStore } from "react";
import type { Store } from "@/platform/storage";

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}
