"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { askForMotion } from "@/platform/shake";
import { follow, settle, spring, THROUGH_SHARE } from "./swipe";

/*
  A row that slides left under the finger to show its actions. Let go past
  halfway and it springs open; swipe a row with a destructive action most of the
  way across and that action grows to fill the row and runs. The row carries the
  speed of the flick into its spring, so it settles the way it was thrown.
  Everything here can also be done by opening the row, so the gesture is a
  shortcut, never the only way.
*/

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  /** Red, last in the row, and run by swiping all the way across. */
  destructive?: boolean;
  onAction: () => void;
}

/** Each action's width once the row is open. */
const ACTION_W = 78;
/** The space before and between actions. */
const GAP = 6;
/** Sideways travel before a press becomes a swipe rather than a tap or a scroll. */
const SLOP = 8;
const FOLD_MS = 240;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

interface Drag {
  id: number;
  x0: number;
  y0: number;
  base: number;
  live: boolean;
  samples: { t: number; x: number }[];
}

/** The open row's close, so opening another row closes it. */
let closeOpen: (() => void) | null = null;

export function SwipeRow({
  actions,
  children,
}: {
  actions: readonly SwipeAction[];
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const offset = useRef(0);
  const width = useRef(0);
  const armed = useRef(false);
  const leaving = useRef(false);
  const drag = useRef<Drag | null>(null);
  const stopSpring = useRef<(() => void) | null>(null);
  const swallowClick = useRef(false);
  const closeLatest = useRef<() => void>(() => {});
  // One stable handle on this row's close, whichever render it was opened in.
  const [closer] = useState(() => () => closeLatest.current());
  const through = actions.some((a) => a.destructive);
  const openWidth = actions.length * (ACTION_W + GAP);

  function paint(x: number) {
    offset.current = x;
    const pulled = Math.max(0, -x);
    const content = contentRef.current;
    const tray = trayRef.current;
    if (content) content.style.transform = x === 0 ? "" : `translate3d(${x}px, 0, 0)`;
    if (!tray) return;
    tray.style.width = `${pulled}px`;
    tray.style.opacity = String(Math.min(1, pulled / 36));
    // Icons and words come up as the actions widen, so none is shown cut in half.
    const reveal = Math.min(1, Math.max(0, (pulled - openWidth * 0.35) / (openWidth * 0.5)));
    tray.style.setProperty("--reveal", reveal.toFixed(3));
    const nowArmed = leaving.current || (through && pulled > width.current * THROUGH_SHARE);
    if (nowArmed !== armed.current) {
      armed.current = nowArmed;
      tray.dataset.armed = String(nowArmed);
      if (nowArmed && !leaving.current && !reduced) navigator.vibrate?.(8);
    }
  }

  function moveTo(target: number, velocity: number, then?: () => void) {
    stopSpring.current?.();
    if (reduced) {
      paint(target);
      then?.();
      return;
    }
    stopSpring.current = spring(offset.current, target, velocity, paint, () => {
      stopSpring.current = null;
      then?.();
    });
  }

  function close() {
    if (closeOpen === closer) closeOpen = null;
    setOpen(false);
    moveTo(0, 0);
  }
  closeLatest.current = close;

  function openUp(velocity: number) {
    if (closeOpen && closeOpen !== closer) closeOpen();
    closeOpen = closer;
    setOpen(true);
    moveTo(-openWidth, velocity);
  }

  /** The destructive action: the row slides away under the red, folds shut, then the action runs. */
  function goThrough(velocity: number) {
    const action = actions.find((a) => a.destructive);
    if (!action || leaving.current) return;
    leaving.current = true;
    askForMotion();
    if (closeOpen === closer) closeOpen = null;
    width.current = rowRef.current?.offsetWidth ?? width.current;
    paint(offset.current);
    moveTo(-width.current, Math.min(velocity, 0), () =>
      fold(() => {
        action.onAction();
        // If the row is still here, nothing removed it, so it comes back.
        requestAnimationFrame(() => {
          const row = rowRef.current;
          if (!row) return;
          row.getAnimations().forEach((a) => a.cancel());
          leaving.current = false;
          setOpen(false);
          paint(0);
        });
      }),
    );
  }

  /** Folds the row's height away, and the gap beside it, so the rows below close up. */
  function fold(then: () => void) {
    const row = rowRef.current;
    if (!row || reduced) {
      then();
      return;
    }
    const gap = row.parentElement ? parseFloat(getComputedStyle(row.parentElement).rowGap) || 0 : 0;
    const last = !row.nextElementSibling;
    const only = last && !row.previousElementSibling;
    const edge = last ? "marginTop" : "marginBottom";
    row.animate(
      [
        { height: `${row.offsetHeight}px`, [edge]: "0px" },
        { height: "0px", [edge]: `${only ? 0 : -gap}px` },
      ],
      { duration: FOLD_MS, easing: EASE, fill: "forwards" },
    ).onfinish = then;
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) closer();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("scroll", closer, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("scroll", closer, true);
    };
  }, [open, closer]);

  useEffect(() => {
    const running = stopSpring;
    return () => {
      running.current?.();
      if (closeOpen === closer) closeOpen = null;
    };
  }, [closer]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || leaving.current) return;
    stopSpring.current?.();
    swallowClick.current = false;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      base: offset.current,
      live: false,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.live) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        if (offset.current !== 0) close();
        return;
      }
      if (Math.abs(dx) < SLOP) return;
      d.live = true;
      // Start from here, so the row moves from where the finger is rather than jumping.
      d.x0 = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      width.current = rowRef.current?.offsetWidth ?? 0;
      if (closeOpen && closeOpen !== closer) closeOpen();
      rowRef.current?.setAttribute("data-dragging", "true");
    }
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 6) d.samples.shift();
    paint(follow(d.base + (e.clientX - d.x0), openWidth, through));
  }

  function release(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.live) {
      // A tap on an open row closes it instead of opening what the row opens.
      if (offset.current !== 0 && !cancelled) {
        swallowClick.current = true;
        close();
      }
      return;
    }
    swallowClick.current = true;
    rowRef.current?.removeAttribute("data-dragging");
    const first = d.samples[0];
    const latest = d.samples[d.samples.length - 1];
    const span = first && latest ? latest.t - first.t : 0;
    const velocity = first && latest && span > 0 ? (latest.x - first.x) / span : 0;
    const where = settle(
      offset.current,
      cancelled ? 0 : velocity,
      width.current,
      openWidth,
      through,
    );
    if (where === "through" && !cancelled) goThrough(velocity);
    else if (where === "open") openUp(velocity);
    else {
      if (closeOpen === closer) closeOpen = null;
      setOpen(false);
      moveTo(0, velocity);
    }
  }

  return (
    <div ref={rowRef} className="hi-swipe">
      <div ref={trayRef} className="hi-swipe__actions" aria-hidden={!open}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className="hi-swipe__action"
            data-tone={a.destructive ? "danger" : undefined}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              if (a.destructive) {
                goThrough(0);
                return;
              }
              close();
              a.onAction();
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div
        ref={contentRef}
        className="hi-swipe__content"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
