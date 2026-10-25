"use client";

import { useState, type ReactNode } from "react";

/** A tab's page: a large title that hands off to a small one in a glass bar on scroll. */
export function Screen({
  title,
  sub,
  trailing,
  children,
}: {
  title: string;
  sub?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div className="hi-view" data-scrolled={scrolled}>
      <div className="hi-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 40)}>
        <header className="hi-pagehead">
          <h1>{title}</h1>
          {sub ? <p>{sub}</p> : null}
        </header>
        {children}
      </div>
      <div className="hi-topbar">
        <div className="hi-topbar__lead" />
        <div className="hi-topbar__title" aria-hidden>
          {title}
        </div>
        <div className="hi-topbar__trail">{trailing}</div>
      </div>
    </div>
  );
}
