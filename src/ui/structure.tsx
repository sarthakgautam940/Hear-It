"use client";

import Link from "next/link";
import { ChevronRight, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function Section({
  title,
  aside,
  note,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="hi-section">
      {title ? (
        <div className="hi-section__head">
          <h2 className="hi-section__title">{title}</h2>
          {aside}
        </div>
      ) : null}
      {children}
      {note ? <p className="hi-section__note">{note}</p> : null}
    </section>
  );
}

export function Group({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="hi-group" role={label ? "group" : undefined} aria-label={label}>
      {children}
    </div>
  );
}

interface RowContent {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  trail?: ReactNode;
  tone?: "danger";
}

function RowInner({ icon, title, sub, trail }: RowContent) {
  return (
    <>
      {icon}
      <span className="hi-row__body">
        <span className="hi-row__title">{title}</span>
        {sub ? <span className="hi-row__sub">{sub}</span> : null}
      </span>
      {trail ? <span className="hi-row__trail">{trail}</span> : null}
    </>
  );
}

/** A row that opens something; the chevron says so. */
export function RowButton({
  onClick,
  chevron = true,
  ...content
}: RowContent & { onClick: () => void; chevron?: boolean }) {
  return (
    <button type="button" className="hi-row" data-tone={content.tone} onClick={onClick}>
      <RowInner
        {...content}
        trail={
          content.trail ??
          (chevron ? <ChevronRight size={20} strokeWidth={2.25} aria-hidden /> : undefined)
        }
      />
    </button>
  );
}

export function RowLink({ href, ...content }: RowContent & { href: string }) {
  return (
    <Link href={href} replace className="hi-row" data-tone={content.tone}>
      <RowInner
        {...content}
        trail={content.trail ?? <ChevronRight size={20} strokeWidth={2.25} aria-hidden />}
      />
    </Link>
  );
}

/** A row that holds its own control, such as a switch or a stepper. */
export function RowStatic(content: RowContent) {
  return (
    <div className="hi-row" data-tone={content.tone}>
      <RowInner {...content} />
    </div>
  );
}

/** A control whose options need the full width, stacked under its name. */
export function ControlBlock({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="hi-control">
      <div className="hi-control__head">
        <span className="hi-row__title">{title}</span>
        {sub ? <span className="hi-row__sub">{sub}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="hi-row__icon" aria-hidden>
      {children}
    </span>
  );
}

export function Stat({
  value,
  label,
  note,
  empty,
}: {
  value: ReactNode;
  label: string;
  note?: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="hi-stat" data-empty={empty ? "true" : undefined}>
      <span className="hi-stat__value">{value}</span>
      <span className="hi-stat__label">{label}</span>
      {note ? <span className="hi-stat__note">{note}</span> : null}
    </div>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div className="hi-banner" role="alert">
      <CircleAlert size={20} strokeWidth={2.25} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function Empty({
  art,
  title,
  children,
  action,
}: {
  art: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="hi-empty">
      {art}
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
