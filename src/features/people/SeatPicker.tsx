"use client";

import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { initials } from "@/core/listeners";
import {
  SEAT_SLOTS,
  SIDE_ALONG_M,
  TABLE_LENGTH_M,
  seatDistanceM,
  seatName,
  seatRank,
  seatSide,
  type SeatSlot,
} from "@/core/seats";

/*
  The table from above, small, with every chair a button: tap the chair someone
  sits in. A chair already taken shows who sits there and cannot be chosen; the
  chosen chair is ink, with a check. The table's length is drawn to scale, so the
  chairs stand where they really do.
*/

const BOX = { w: 300, h: 300 };
const TABLE = { w: 120, top: 70, h: 180 };
const CHAIR = 52;
/** The chairs' centers sit this far outside the table's long edges. */
const OUT = 36;

function chairCenter(slot: SeatSlot): { x: number; y: number } {
  const mid = BOX.w / 2;
  const bottom = TABLE.top + TABLE.h;
  if (seatSide(slot) === "head") return { x: mid, y: TABLE.top - OUT };
  const along = (SIDE_ALONG_M[seatRank(slot)] ?? 0) / TABLE_LENGTH_M;
  const y = bottom - along * TABLE.h;
  return { x: seatSide(slot) === "left" ? mid - TABLE.w / 2 - OUT : mid + TABLE.w / 2 + OUT, y };
}

export function SeatPicker({
  value,
  onChange,
  taken,
}: {
  value: SeatSlot;
  onChange: (seat: SeatSlot) => void;
  /** Chairs other people sit in, with their names. */
  taken: ReadonlyMap<SeatSlot, string>;
}) {
  const refs = useRef<Partial<Record<SeatSlot, HTMLButtonElement | null>>>({});
  const open = SEAT_SLOTS.filter((s) => !taken.has(s));

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = open[(open.indexOf(value) + step + open.length) % open.length];
    if (!next) return;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="hi-seats" role="radiogroup" aria-label="Their chair at the table">
      <div
        className="hi-seats__table"
        style={{ width: TABLE.w, height: TABLE.h, top: TABLE.top }}
      />
      <span className="hi-seats__you" style={{ top: TABLE.top + TABLE.h + 12 }}>
        You
      </span>
      {SEAT_SLOTS.map((slot) => {
        const c = chairCenter(slot);
        const who = taken.get(slot);
        const on = slot === value;
        const style = { left: c.x - CHAIR / 2, top: c.y - CHAIR / 2, width: CHAIR, height: CHAIR };
        return (
          <button
            key={slot}
            ref={(el) => {
              refs.current[slot] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={
              who
                ? `${seatName(slot)}: ${who} sits here`
                : `${seatName(slot)}, about ${seatDistanceM(slot).toFixed(1)} meters from you`
            }
            tabIndex={on ? 0 : -1}
            disabled={who !== undefined}
            className="hi-seats__chair"
            data-state={on ? "on" : who ? "taken" : "open"}
            style={style}
            onClick={() => onChange(slot)}
            onKeyDown={onKeyDown}
          >
            {on ? (
              <Check size={22} strokeWidth={3} aria-hidden />
            ) : who ? (
              <span aria-hidden>{initials(who)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
