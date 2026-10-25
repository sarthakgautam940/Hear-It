"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button, type ButtonVariant } from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The focus contract of a dialog: focus moves inside when it opens, Tab stays
 * inside, Escape closes, the page behind does not scroll, and focus returns to
 * whatever opened it when it closes.
 */
export function useDialogFocus(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose?: () => void): void {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0] as HTMLElement;
      const lastItem = items[items.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || active === panel)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, panelRef, onClose]);
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: 400 | 560 | 720;
  children: ReactNode;
  footer?: ReactNode;
  closeButton?: boolean;
}

export function Modal({ open, onClose, title, width = 560, children, footer, closeButton = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, panelRef, onClose);
  if (!open) return null;
  return (
    <>
      <div className="hi-scrim" onClick={onClose} aria-hidden />
      <div className="hi-modal">
        <div
          ref={panelRef}
          className="hi-modal__panel"
          style={{ maxWidth: width }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          {closeButton ? (
            <button type="button" className="hi-iconbtn hi-modal__close" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden />
            </button>
          ) : null}
          <h2 className="hi-modal__title">{title}</h2>
          <div className="hi-modal__body">{children}</div>
          {footer ? <div className="hi-modal__footer">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  confirmVariant = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  consequence: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={400}
      closeButton={false}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={confirmVariant}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{consequence}</p>
    </Modal>
  );
}
