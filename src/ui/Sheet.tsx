"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { pushBehind, registerSheet, useOverlayRoot } from "@/shell/overlays";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** "full" covers the screen and steps the page behind it back; "auto" fits its content. */
  size?: "auto" | "full";
  trailing?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const EXIT_MS = 420;
const DISMISS_PX = 110;
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  size = "auto",
  trailing,
  footer,
  children,
}: SheetProps) {
  const root = useOverlayRoot();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (size !== "full" || !shown) return;
    return pushBehind();
  }, [size, shown]);

  useEffect(() => {
    if (!shown) return;
    return registerSheet(() => onCloseRef.current());
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    const panel = panelRef.current;
    const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    target?.focus({ preventScroll: true });
    return () => opener.current?.focus({ preventScroll: true });
  }, [shown]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* Dragging the grip or the header down far enough dismisses, as on iOS. */
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, a, input")) return;
    const panel = panelRef.current;
    if (!panel) return;
    // The phone may be drawn scaled; pointer pixels convert back to the sheet's own.
    const scale = panel.getBoundingClientRect().height / panel.offsetHeight || 1;
    const startY = event.clientY;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const distance = (e: PointerEvent) => Math.max(0, (e.clientY - startY) / scale);
    const move = (e: PointerEvent) => setDrag(distance(e));
    const end = (e: PointerEvent) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      const dy = distance(e);
      setDrag(null);
      if (dy > DISMISS_PX) onCloseRef.current();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  if (!mounted || !root) return null;
  const style = drag === null ? undefined : ({ "--drag": `${drag}px` } as CSSProperties);
  return createPortal(
    <>
      <div
        className="hi-scrim"
        data-open={shown}
        onClick={() => onCloseRef.current()}
        aria-hidden
      />
      <div
        ref={panelRef}
        className="hi-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-size={size}
        data-open={shown}
        data-dragging={drag !== null}
        style={style}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="hi-sheet__grip" onPointerDown={onPointerDown} aria-hidden />
        <div className="hi-sheet__head" onPointerDown={onPointerDown}>
          <button
            type="button"
            className="hi-ibtn"
            onClick={() => onCloseRef.current()}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.25} aria-hidden />
          </button>
          <h2 className="hi-sheet__title">{title}</h2>
          <div>{trailing}</div>
        </div>
        <div className="hi-sheet__body">{children}</div>
        {footer ? <div className="hi-sheet__foot">{footer}</div> : null}
      </div>
    </>,
    root,
  );
}
