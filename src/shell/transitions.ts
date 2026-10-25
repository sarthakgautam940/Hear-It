"use client";

import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { TABS } from "@/lib/tabs";

/*
  Page transitions, drawn with the browser's view transitions: the screen is
  captured, the change is made, and the old and new pictures are animated in
  CSS (shell.css). A tab slides the way the tabs lie and settles with a small
  spring; a first-run step reshapes its picture while its words rise into
  place. Only the elements a kind of transition moves are named while it runs,
  so nothing else on screen joins in. Without view transitions, or with motion
  reduced, the change simply happens.
*/

export type Direction = "forward" | "back";
type Kind = "tabs" | "steps";
type StartViewTransition = (update: () => Promise<void> | void) => { finished: Promise<void> };

/** Longest a tab's transition waits for the next page before animating whatever is there. */
const PAGE_WAIT_MS = 1200;

let latest = 0;
let pageShown: (() => void) | null = null;

function starter(): StartViewTransition | null {
  const doc = document as Document & { startViewTransition?: StartViewTransition };
  if (typeof doc.startViewTransition !== "function") return null;
  const reduced =
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? null : doc.startViewTransition.bind(document);
}

function run(kind: Kind, direction: Direction, update: () => Promise<void> | void): void {
  const start = starter();
  if (!start) {
    void update();
    return;
  }
  const root = document.documentElement;
  const id = ++latest;
  root.dataset.vt = kind;
  root.dataset.nav = direction;
  const clear = () => {
    // A newer transition owns the attributes once it has started.
    if (id !== latest) return;
    delete root.dataset.vt;
    delete root.dataset.nav;
  };
  try {
    start(update).finished.then(clear, clear);
  } catch {
    clear();
    void update();
  }
}

/** Changes a first-run step; React commits the new step inside the transition. */
export function stepTransition(direction: Direction, change: () => void): void {
  run("steps", direction, () => flushSync(change));
}

/** Opens a tab through the router; the transition waits until the new page is on screen. */
export function tabTransition(direction: Direction, go: () => void): void {
  run(
    "tabs",
    direction,
    () =>
      new Promise<void>((resolve) => {
        pageShown?.();
        pageShown = resolve;
        go();
        window.setTimeout(resolve, PAGE_WAIT_MS);
      }),
  );
}

/** Which tab a path belongs to, or -1. */
export function tabIndex(path: string): number {
  return TABS.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)));
}

/** Goes to a tab's page from anywhere, sliding the way the tabs lie. */
export function useTabNavigate(): (href: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  return (href) => {
    const from = tabIndex(pathname);
    const to = tabIndex(href);
    if (to < 0 || from < 0 || to === from) {
      router.replace(href);
      return;
    }
    tabTransition(to > from ? "forward" : "back", () => router.replace(href));
  };
}

/** The shell calls this once a new page has committed, so its transition can begin. */
export function pageCommitted(): void {
  pageShown?.();
  pageShown = null;
}
