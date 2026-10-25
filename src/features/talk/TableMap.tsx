"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { seatName, seatSide, type SeatSlot } from "@/core/seats";
import {
  CHAIR_LANE,
  NAME_INSET,
  OPEN_CHAIRS,
  nameWidth,
  seatPoint,
  tableGeometry,
  type TableGeometry,
  type TableSeat,
} from "./table";
import { TableScene } from "./TableScene";

/** A chair's button reaches this far past the midline, so buttons across the table barely meet. */
const MIDLINE_OVERLAP = 24;

export interface TableMapProps {
  seats: readonly TableSeat[];
  description: string;
  /** Points kept clear above the table for a control laid over the picture. */
  top?: number;
  /** Writes each name beside its place; off where a list beside the picture names everyone. */
  named?: boolean;
  onSeat?: ((id: string) => void) | undefined;
  /** With nobody seated yet, adds someone in the empty chair that was tapped. */
  onAdd?: ((seat: SeatSlot) => void) | undefined;
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Who has been drawn before, so only people added since take their seats with a slide. */
function useFresh(ids: readonly string[]): string[] {
  const seen = useRef<Set<string> | null>(null);
  const fresh = seen.current ? ids.filter((id) => !seen.current?.has(id)) : [];
  useEffect(() => {
    seen.current = new Set([...(seen.current ?? []), ...ids]);
  });
  return fresh;
}

/**
 * The table, sized to its box: the picture Talk, People and the first run share.
 * An empty table shows a few open chairs with a sign to sit there; once anyone is
 * seated, only their chairs are drawn.
 */
export function TableMap({
  seats,
  description,
  top = 10,
  named = true,
  onSeat,
  onAdd,
}: TableMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const fresh = useFresh(seats.map((s) => s.id));
  const head = seats.some((s) => s.seat === "H");
  const g = size && size.w > 0 && size.h > 0 ? tableGeometry(size.w, size.h, top, head) : null;
  const open = seats.length === 0;

  return (
    <div ref={ref} className="hi-tm">
      {g ? (
        <>
          <TableScene g={g} seats={seats} description={description} fresh={fresh} named={named} />
          {onSeat
            ? seats.map((s) => (
                <ChairButton
                  key={s.id}
                  g={g}
                  slot={s.seat}
                  reach={named ? nameWidth(s.label) : 0}
                  label={`Change ${s.label}`}
                  onPress={() => onSeat(s.id)}
                />
              ))
            : null}
          {open && onAdd
            ? OPEN_CHAIRS.map((slot) => (
                <ChairButton
                  key={slot}
                  g={g}
                  slot={slot}
                  reach={0}
                  label={`Add someone ${seatName(slot).toLowerCase()}`}
                  onPress={() => onAdd(slot)}
                />
              ))
            : null}
        </>
      ) : null}
    </div>
  );
}

/** A chair's tap target: the chair and whoever sits in it, and their name when there is one. */
function ChairButton({
  g,
  slot,
  reach,
  label,
  onPress,
}: {
  g: TableGeometry;
  slot: SeatSlot;
  reach: number;
  label: string;
  onPress: () => void;
}) {
  const { x, y } = seatPoint(g, slot);
  const side = seatSide(slot);
  const tall = Math.max(48, 64 * g.scale);
  let style: { left: number; top: number; width: number; height: number };
  if (side === "head") {
    style = { left: x - 40, top: y - 44 * g.scale, width: 80, height: Math.max(48, 76 * g.scale) };
  } else {
    const width = Math.min(
      CHAIR_LANE + (reach > 0 ? NAME_INSET * g.scale + reach + 8 : 16),
      g.mid + MIDLINE_OVERLAP,
    );
    style = { left: side === "left" ? 0 : g.width - width, top: y - tall / 2, width, height: tall };
  }
  return (
    <button
      type="button"
      className="hi-tm__hit"
      aria-label={label}
      onClick={onPress}
      style={style}
    />
  );
}
