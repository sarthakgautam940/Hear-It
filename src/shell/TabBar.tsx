"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { TABS } from "@/lib/tabs";
import { tabIndex, useTabNavigate } from "./transitions";

export function TabBar() {
  const current = tabIndex(usePathname());
  const go = useTabNavigate();
  return (
    <nav className="hi-tabbar" aria-label="Main" style={{ "--tab": current } as CSSProperties}>
      {current >= 0 ? <span className="hi-tabbar__pill" aria-hidden /> : null}
      {TABS.map(({ href, label, icon: Icon }, i) => {
        const active = i === current;
        return (
          <Link
            key={href}
            href={href}
            replace
            className="hi-tab"
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              if (active || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                return;
              e.preventDefault();
              go(href);
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.3 : 2} aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
