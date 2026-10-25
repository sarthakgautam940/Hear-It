"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { useEngine, useEngineInputs } from "@/hooks/useEngine";
import { BRAND } from "@/lib/brand";
import { destinationFor, PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { applyTheme, resolvedTheme } from "@/lib/theme";
import { CommandPalette } from "./CommandPalette";

const RAIL_KEY = "hearit-rail";
const WIDTH_KEY = "hearit-rail-w";
const MIN_W = 200;
const MAX_W = 360;
const DEFAULT_W = 240;
const COLLAPSE_BELOW = 150;
const EXPAND_ABOVE = 200;
const COMPACT_AT = 1024;

const STATUS_WORD: Record<string, string> = {
  starting: "Starting",
  listening: "Listening",
  boosting: "Boosting",
  "not-needed": "Chatter not needed",
  paused: "Paused",
};

/**
 * The application shell: a collapsible, resizable sidebar that becomes a
 * drawer below 1024px, a frosted top bar with the page name, the palette
 * trigger and the live word, and the content region.
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shellRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_W);
  const [compact, setCompact] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [macKeys, setMacKeys] = useState(false);
  const [theme, setTheme] = useState<"paper" | "night">("paper");
  useEngineInputs();
  const live = useEngine();

  useEffect(() => {
    setMacKeys(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    try {
      setCollapsed(localStorage.getItem(RAIL_KEY) === "1");
      const stored = Number(localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(stored) && stored >= MIN_W && stored <= MAX_W) setWidth(stored);
    } catch {
      // Defaults stand.
    }
    setTheme(resolvedTheme());
    const mq = window.matchMedia(`(max-width: ${COMPACT_AT - 1}px)`);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const persist = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Session-only persistence is fine.
    }
  }, []);

  const toggleRail = () =>
    setCollapsed((prev) => {
      persist(RAIL_KEY, prev ? "0" : "1");
      return !prev;
    });

  function onGripPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (compact || event.button !== 0) return;
    event.preventDefault();
    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = collapsed ? 0 : width;
    let liveWidth = width;
    let liveCollapsed = collapsed;
    setResizing(true);
    const onMove = (move: PointerEvent) => {
      const raw = startWidth + (move.clientX - startX);
      if (liveCollapsed) {
        if (raw > EXPAND_ABOVE) {
          liveCollapsed = false;
          setCollapsed(false);
          liveWidth = Math.min(MAX_W, raw);
          shellRef.current?.style.setProperty("--sidebar-w", `${liveWidth}px`);
        }
        return;
      }
      if (raw < COLLAPSE_BELOW) {
        liveCollapsed = true;
        setCollapsed(true);
        return;
      }
      liveWidth = Math.max(MIN_W, Math.min(MAX_W, raw));
      shellRef.current?.style.setProperty("--sidebar-w", `${liveWidth}px`);
    };
    const onUp = () => {
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
      setResizing(false);
      setWidth(liveWidth);
      persist(WIDTH_KEY, String(liveWidth));
      persist(RAIL_KEY, liveCollapsed ? "1" : "0");
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
  }

  function onGripKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (compact) return;
    const step = event.shiftKey ? 32 : 8;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? step : -step;
      if (collapsed) {
        if (delta > 0) {
          setCollapsed(false);
          persist(RAIL_KEY, "0");
        }
        return;
      }
      const next = width + delta;
      if (next < COLLAPSE_BELOW) {
        setCollapsed(true);
        persist(RAIL_KEY, "1");
        return;
      }
      const clamped = Math.max(MIN_W, Math.min(MAX_W, next));
      setWidth(clamped);
      persist(WIDTH_KEY, String(clamped));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleRail();
    }
  }

  function toggleTheme() {
    const next = resolvedTheme() === "night" ? "paper" : "night";
    applyTheme(next);
    setTheme(next);
  }

  const railed = collapsed && !compact;
  const current = destinationFor(pathname);
  const liveWord = live.phase === "live" || live.phase === "starting" ? STATUS_WORD[live.status] : null;

  const navItem = (item: (typeof PRIMARY_NAV)[number]) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="hi-nav__item"
        data-active={active}
        aria-current={active ? "page" : undefined}
        title={railed ? item.label : undefined}
        aria-label={railed ? item.label : undefined}
      >
        <Icon size={18} className="hi-nav__icon" aria-hidden />
        {!railed ? <span className="hi-nav__label">{item.label}</span> : null}
      </Link>
    );
  };

  return (
    <div
      className="hi-shell"
      ref={shellRef}
      data-resizing={resizing ? "true" : undefined}
      style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
    >
      <a href="#hi-main" className="hi-skip-link">
        Skip to content
      </a>
      <CommandPalette />
      <div className="hi-drawer-scrim" data-open={drawerOpen ? "true" : undefined} onClick={() => setDrawerOpen(false)} aria-hidden />
      <aside
        className="hi-sidebar"
        data-collapsed={railed}
        data-open={drawerOpen ? "true" : undefined}
        aria-hidden={compact && !drawerOpen ? true : undefined}
        inert={compact && !drawerOpen}
      >
        <Link href="/" className="hi-brand" aria-label={`${BRAND.name} home`}>
          <BrandMark size={26} className="hi-brand__mark" />
          {!railed ? <span className="hi-brand__name">{BRAND.name}</span> : null}
        </Link>
        <nav className="hi-nav" aria-label="Primary">
          {PRIMARY_NAV.map(navItem)}
        </nav>
        <div className="hi-nav__group">
          {SECONDARY_NAV.map(navItem)}
          {!compact ? (
            <button type="button" onClick={toggleRail} className="hi-nav__item" aria-label={railed ? "Expand sidebar" : "Collapse sidebar"}>
              {railed ? <PanelLeftOpen size={18} className="hi-nav__icon" aria-hidden /> : <PanelLeftClose size={18} className="hi-nav__icon" aria-hidden />}
              {!railed ? <span className="hi-nav__label">Collapse</span> : null}
            </button>
          ) : null}
        </div>
        {!compact ? (
          <div
            className="hi-sidebar__grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={MIN_W}
            aria-valuemax={MAX_W}
            aria-valuenow={railed ? 0 : width}
            tabIndex={0}
            onPointerDown={onGripPointerDown}
            onKeyDown={onGripKeyDown}
            onDoubleClick={() => {
              setCollapsed(false);
              setWidth(DEFAULT_W);
              persist(RAIL_KEY, "0");
              persist(WIDTH_KEY, String(DEFAULT_W));
            }}
          />
        ) : null}
      </aside>

      <div className="hi-shell__body">
        <header className="hi-frost hi-topbar">
          <button type="button" className="hi-iconbtn hi-topbar__menu" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}>
            <Menu size={20} aria-hidden />
          </button>
          <nav aria-label="Breadcrumb" className="hi-breadcrumb">
            <span className="hi-breadcrumb__current">{current?.label ?? BRAND.name}</span>
          </nav>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="hi-topsearch"
            onClick={() => window.dispatchEvent(new CustomEvent("hearit:palette"))}
            aria-label="Search and go to"
          >
            <Search size={16} aria-hidden />
            <span className="hi-topsearch__label">Search</span>
            <kbd className="hi-topsearch__kbd" aria-hidden>
              {macKeys ? "⌘" : "Ctrl"} K
            </kbd>
          </button>
          <span style={{ flex: 1 }} />
          <div className="hi-topbar__utility">
            {liveWord ? (
              <Link href="/" className="hi-live" aria-live="polite">
                {liveWord}
              </Link>
            ) : null}
            <button type="button" className="hi-iconbtn" onClick={toggleTheme} aria-label={theme === "night" ? "Switch to paper" : "Switch to night"}>
              {theme === "night" ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
            </button>
          </div>
        </header>
        <main id="hi-main" tabIndex={-1} className="hi-main">
          <div className="hi-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
