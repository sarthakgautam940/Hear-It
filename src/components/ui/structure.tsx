import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** The heading band: one object per surface, the title and one state sentence. */
export function PageHead({
  title,
  lead,
  rest,
  actions,
}: {
  title: ReactNode;
  lead?: ReactNode;
  rest?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="hi-phead">
      <div className="hi-phead__text">
        <h1 className="hi-phead__title">{title}</h1>
        {lead || rest ? (
          <p className="hi-phead__say">
            {lead ? <span className="hi-phead__lead">{lead}</span> : null}
            {lead && rest ? " " : null}
            {rest}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="hi-phead__side">
          <div className="hi-phead__act">{actions}</div>
        </div>
      ) : null}
    </header>
  );
}

export function Region({
  title,
  note,
  aside,
  tight,
  children,
}: {
  title?: ReactNode;
  note?: ReactNode;
  aside?: ReactNode;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cx("hi-region", tight && "hi-region--tight")}>
      {title || aside ? (
        <div className="hi-region__head">
          <div style={{ minWidth: 0 }}>
            {title ? <h2 className="hi-region__title">{title}</h2> : null}
            {note ? <p className="hi-region__note">{note}</p> : null}
          </div>
          {aside ? <div className="hi-region__aside">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SettingGroup({ children }: { children: ReactNode }) {
  return <div className="hi-setgroup">{children}</div>;
}

export function SettingRow({
  title,
  note,
  control,
  stack,
  disabled,
}: {
  title: ReactNode;
  note?: ReactNode;
  control?: ReactNode;
  stack?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={cx("hi-setrow", stack && "hi-setrow--stack")} data-disabled={disabled ? "true" : undefined}>
      <div className="hi-setrow__text">
        <div className="hi-setrow__title">{title}</div>
        {note ? <div className="hi-setrow__note">{note}</div> : null}
      </div>
      {control ? <div className="hi-setrow__control">{control}</div> : null}
    </div>
  );
}

export function Surface({
  inset,
  className,
  children,
}: {
  inset?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("hi-panel", "hi-panel--pad", inset && "hi-panel--inset", className)}>{children}</div>;
}

/** The page keeps its anatomy and names the one next act. */
export function Standing({
  icon,
  head,
  note,
  actions,
}: {
  icon?: ReactNode;
  head: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="hi-standing">
      {icon ? <div className="hi-standing__icon">{icon}</div> : null}
      <div className="hi-standing__head">{head}</div>
      {note ? <div className="hi-standing__note">{note}</div> : null}
      {actions ? <div className="hi-standing__act">{actions}</div> : null}
    </div>
  );
}

export interface DefRow {
  term: ReactNode;
  value: ReactNode;
  empty?: boolean;
}

export function DefList({ rows }: { rows: DefRow[] }) {
  return (
    <dl className="hi-deflist">
      {rows.map((row, i) => (
        <div className="hi-deflist__row" key={i}>
          <dt className="hi-deflist__term">{row.term}</dt>
          <dd className="hi-deflist__val" data-empty={row.empty ? "true" : undefined} style={{ margin: 0 }}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Measure({
  label,
  value,
  unit,
  note,
  empty,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="hi-measure">
      <div className="hi-measure__label">{label}</div>
      <div className="hi-measure__value" data-empty={empty ? "true" : undefined}>
        {value}
        {unit ? <span className="hi-measure__unit">{unit}</span> : null}
      </div>
      {note ? <div className="hi-measure__note">{note}</div> : null}
    </div>
  );
}
