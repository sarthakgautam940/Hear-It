"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { askForMotion, onShake } from "@/platform/shake";
import { useOverlayRoot } from "@/shell/overlays";
import { Button } from "./Button";

interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action: ToastAction | null;
}

const PLAIN_MS = 3000;
/* A toast with an action stays long enough to reach for it. */
const ACTION_MS = 5000;
/* How long a toast takes to lift away before it is gone. */
const LEAVE_MS = 200;
/* Shaking the phone offers to undo the last undoable thing for this long after it. */
const SHAKE_UNDO_MS = 60_000;

/** The last thing a toast offered to undo, which a shake can still undo. */
interface Undoable {
  message: string;
  run: () => void;
  at: number;
}

const ToastContext = createContext<{
  show: (message: string, action?: ToastAction) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast needs <ToastProvider>");
  return ctx;
}

function Toast({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), toast.action ? ACTION_MS : PLAIN_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onDone(toast.id), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, toast.id, onDone]);
  return (
    <div className="hi-toast" role="status" data-leaving={leaving || undefined}>
      <span className="hi-toast__text">{toast.message}</span>
      {toast.action ? (
        <Button
          variant="secondary"
          onClick={() => {
            toast.action?.onAction();
            onDone(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [asking, setAsking] = useState<Undoable | null>(null);
  const nextId = useRef(1);
  const undoable = useRef<Undoable | null>(null);
  const root = useOverlayRoot();
  const done = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, action?: ToastAction) => {
    const id = nextId.current++;
    let item: ToastItem = { id, message, action: action ?? null };
    if (action?.label === "Undo") {
      // The toast's Undo and a shake run the same undo, and only once.
      let used = false;
      const run = () => {
        if (used) return;
        used = true;
        if (undoable.current?.run === run) undoable.current = null;
        setToasts((all) => all.filter((t) => t.id !== id));
        action.onAction();
      };
      undoable.current = { message, run, at: Date.now() };
      item = { ...item, action: { label: action.label, onAction: run } };
      askForMotion();
    }
    setToasts((all) => [...all.slice(-1), item]);
  }, []);

  useEffect(
    () =>
      onShake(() => {
        const last = undoable.current;
        if (last && Date.now() - last.at < SHAKE_UNDO_MS) setAsking(last);
      }),
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {root
        ? createPortal(
            <>
              <div className="hi-toasts" aria-live="polite">
                {toasts.map((t) => (
                  <Toast key={t.id} toast={t} onDone={done} />
                ))}
              </div>
              {asking ? (
                <UndoPrompt
                  message={asking.message}
                  onUndo={() => {
                    asking.run();
                    setAsking(null);
                  }}
                  onCancel={() => setAsking(null)}
                />
              ) : null}
            </>,
            root,
          )
        : null}
    </ToastContext.Provider>
  );
}

/** What a shake brings up: the last undoable thing, and a choice to undo it. */
function UndoPrompt({
  message,
  onUndo,
  onCancel,
}: {
  message: string;
  onUndo: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    // Focus stays on the two choices while the question is open.
    const buttons = Array.from(box.current?.querySelectorAll("button") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[(at + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  return (
    <div className="hi-alert">
      <div className="hi-alert__scrim" onClick={onCancel} aria-hidden />
      <div
        ref={box}
        className="hi-alert__box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        onKeyDown={onKeyDown}
      >
        <h2 id={`${id}-title`} className="hi-alert__title">
          Undo?
        </h2>
        <p id={`${id}-text`} className="hi-alert__text">
          {message}
        </p>
        <div className="hi-alert__actions">
          <Button variant="secondary" size="large" block onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="large" block autoFocus onClick={onUndo}>
            Undo
          </Button>
        </div>
      </div>
    </div>
  );
}
