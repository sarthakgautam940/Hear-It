"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/* Overlays that more than one screen opens: a night's report and the voice check. */
export type Overlay = { kind: "night"; sessionId: string } | { kind: "voiceCheck" } | null;

let current: Overlay = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function openNight(sessionId: string): void {
  current = { kind: "night", sessionId };
  emit();
}

export function openVoiceCheck(): void {
  current = { kind: "voiceCheck" };
  emit();
}

export function closeOverlay(): void {
  current = null;
  emit();
}

export function useOverlay(): Overlay {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}

/* How many full sheets are open; any at all steps the screen behind them back. */
let depth = 0;
const depthListeners = new Set<() => void>();

export function pushBehind(): () => void {
  depth += 1;
  for (const l of depthListeners) l();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth -= 1;
    for (const l of depthListeners) l();
  };
}

export function useBehind(): boolean {
  return useSyncExternalStore(
    (l) => {
      depthListeners.add(l);
      return () => depthListeners.delete(l);
    },
    () => depth > 0,
    () => false,
  );
}

/* The open sheets, innermost last; Escape closes the innermost wherever focus sits. */
const openSheets: Array<() => void> = [];

function onEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const top = openSheets[openSheets.length - 1];
  if (!top) return;
  event.preventDefault();
  top();
}

export function registerSheet(close: () => void): () => void {
  if (openSheets.length === 0) document.addEventListener("keydown", onEscape);
  openSheets.push(close);
  return () => {
    const i = openSheets.lastIndexOf(close);
    if (i >= 0) openSheets.splice(i, 1);
    if (openSheets.length === 0) document.removeEventListener("keydown", onEscape);
  };
}

/** The element sheets and toasts render into, inside the phone's screen. */
export function useOverlayRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(document.getElementById("hi-overlays")), []);
  return root;
}
