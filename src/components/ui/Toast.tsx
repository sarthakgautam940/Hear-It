"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

export interface ToastOptions {
  tone?: "default" | "error";
  action?: { label: string; onAction: () => void };
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const TOAST_MS = 8000;

const ToastContext = createContext<{ show: (message: string, options?: ToastOptions) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast requires <ToastProvider>");
  return ctx;
}

/* A toast carrying an action is a control and never expires; hover and focus pause the others. */
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [held, setHeld] = useState(false);
  const sticky = toast.tone === "error" || Boolean(toast.action);

  useEffect(() => {
    if (sticky || held) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs ?? TOAST_MS);
    return () => clearTimeout(timer);
  }, [sticky, held, toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      className={toast.tone === "error" ? "hi-toast hi-toast--error" : "hi-toast"}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={() => onDismiss(toast.id)}>
        Dismiss
      </Button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, ...options }]);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="hi-toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
