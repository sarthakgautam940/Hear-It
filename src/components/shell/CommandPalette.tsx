"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useDialogFocus } from "@/components/ui/Modal";
import { ALL_NAV, PALETTE_ACTIONS, type IconComponent } from "@/lib/nav";
import { applyTheme, type ThemeChoice } from "@/lib/theme";

interface Row {
  label: string;
  context: string;
  keywords: string;
  icon: IconComponent;
  run: () => void;
}

function score(row: Row, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const label = row.label.toLowerCase();
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 60;
  const hay = `${label} ${row.keywords.toLowerCase()}`;
  return q.split(/\s+/).every((w) => hay.includes(w)) ? 20 : 0;
}

/**
 * Ctrl or Cmd+K anywhere: type to filter pages and actions, arrows and Enter
 * to go. One flat list, destinations first, then actions, then themes.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hearit:palette", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hearit:palette", openPalette);
    };
  }, [open, openPalette, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useDialogFocus(open, panelRef);

  useEffect(() => setActive(0), [query]);

  const rows = useMemo<Row[]>(() => {
    const go = (href: string) => () => router.push(href);
    const theme = (choice: ThemeChoice, label: string, icon: IconComponent): Row => ({
      label,
      context: "Theme",
      keywords: `theme appearance ${choice} dark light`,
      icon,
      run: () => applyTheme(choice),
    });
    const all: Row[] = [
      ...ALL_NAV.map((d) => ({
        label: d.label,
        context: d.context,
        keywords: d.keywords,
        icon: d.icon,
        run: go(d.href),
      })),
      ...PALETTE_ACTIONS.map((a) => ({
        label: a.label,
        context: a.context,
        keywords: a.keywords,
        icon: a.icon,
        run: go(a.href),
      })),
      theme("paper", "Paper theme", Sun),
      theme("night", "Night theme", Moon),
      theme("system", "Follow the system theme", Monitor),
    ];
    return all
      .map((row) => ({ row, s: score(row, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.row);
  }, [query, router]);

  function run(row: Row | undefined) {
    if (!row) return;
    close();
    row.run();
  }

  if (!open) return null;

  return (
    <div
      className="hi-palette"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="hi-palette__panel"
        role="dialog"
        aria-label="Go to"
        tabIndex={-1}
      >
        <input
          ref={inputRef}
          className="hi-palette__input"
          role="combobox"
          aria-expanded="true"
          aria-controls="hi-palette-list"
          aria-activedescendant={rows[active] ? `hi-palette-${active}` : undefined}
          aria-label="Search pages and actions"
          placeholder="Where to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, rows.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(rows[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        />
        <ul
          id="hi-palette-list"
          className="hi-palette__list"
          role="listbox"
          aria-label="Destinations"
        >
          {rows.length === 0 ? (
            <li className="hi-palette__empty">
              Nothing matches. Try a page name like Room, or an action like Start.
            </li>
          ) : (
            rows.map((row, i) => {
              const Icon = row.icon;
              return (
                <li key={`${row.context}:${row.label}`} role="presentation">
                  <button
                    id={`hi-palette-${i}`}
                    role="option"
                    aria-selected={i === active}
                    type="button"
                    className="hi-palette__row"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(row)}
                  >
                    <Icon size={18} aria-hidden />
                    <span>{row.label}</span>
                    <span className="hi-palette__context">{row.context}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
