"use client";

import { useEffect, useRef } from "react";
import { HEARING_SHORT, initials } from "@/core/listeners";
import { SEAT_WORD, type SeatState } from "@/core/reach";
import type { Hearing } from "@/core/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface Seat {
  id: string;
  label: string;
  hearing: Hearing;
  distanceM: number;
  angleDeg: number;
  state: SeatState | null;
}

export interface ReachCanvasProps {
  seats: Seat[];
  reach: Record<Hearing, number> | null;
  previewReach: Record<Hearing, number> | null;
  chatterAudible: boolean;
  rippleAt: number;
  live: boolean;
  description: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlacedSeat extends Seat {
  x: number;
  y: number;
}

type Side = "below" | "above" | "right" | "left";

interface SeatLabel {
  seat: PlacedSeat;
  lines: string[];
  box: Box;
  side: Side;
}

interface Metrics {
  chip: number;
  gap: number;
  initialsFont: number;
  nameFont: number;
  wordFont: number;
  lines: 1 | 2;
}

const BG = "#1b1a17";
const CREAM = "245, 243, 236";
const REACH = "226, 196, 138";
const FONT = '"General Sans", -apple-system, "Segoe UI", Roboto, sans-serif';
/* Outer band for a listener who hears well, inner bands for more trouble; stacking brightens the center. */
const BANDS: ReadonlyArray<readonly [Hearing, number]> = [
  ["well", 0.2],
  ["some", 0.17],
  ["alot", 0.15],
];
/* A 2 dB error in the voice level moves the reach by this factor either way, so the edge fades across it. */
const EDGE = 1.32;
const EASE_MS = 300;
const RIPPLE_MS = 900;
/* The caption band across the top of the plane, which no chip or label may enter. */
const CAPTION_PX = 44;
const BASELINE_FROM_BOTTOM_PX = 72;
const TALKER_RADIUS = 15;
const RING_LABEL_H = 16;
/* Where a seat's label may go, in order of preference; the first side that touches nothing wins. */
const SIDES: readonly Side[] = ["below", "above", "right", "left"];

/**
 * The reach map: the talker at the bottom, rings every half meter, the family
 * at their seats, and three soft discs of reach that swell when the chatter
 * plays. Every radius comes from the reach model; the renderer only eases.
 */
export function ReachCanvas(props: ReachCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const eased: Record<Hearing, number> = { well: 0, some: 0, alot: 0 };
    const ripples: number[] = [];
    let lastRipple = propsRef.current.rippleAt;
    let last = performance.now();
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let raf = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    observer.observe(canvas);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (width === 0 || height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.round(width * dpr);
      const ph = Math.round(height * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      const p = propsRef.current;
      const still = reducedRef.current;
      const dt = Math.min(100, now - last);
      last = now;
      const k = still ? 1 : 1 - Math.exp(-dt / EASE_MS);
      for (const h of ["well", "some", "alot"] as const) {
        const target = p.reach ? p.reach[h] : 0;
        eased[h] += (target - eased[h]) * k;
      }

      const compact = width < 520;
      const m: Metrics = {
        chip: compact ? 20 : 24,
        gap: compact ? 7 : 8,
        initialsFont: compact ? 13 : 15,
        nameFont: compact ? 13 : 14,
        wordFont: compact ? 12 : 13,
        // A crowded compact plane keeps one line per seat: the state while live, else the name.
        lines: compact && p.seats.length > 3 ? 1 : 2,
      };
      const labelHalf = compact ? 50 : 58;
      const ox = width / 2;
      const oy = height - BASELINE_FROM_BOTTOM_PX;
      const { fan, pxPerM } = fitSeats(p.seats, ox, oy, m.chip, labelHalf);
      const placed: PlacedSeat[] = p.seats.map((s) => {
        const seat = { ...s, angleDeg: s.angleDeg * fan };
        const [dx, dy] = seatPoint(seat, 1, pxPerM);
        return { ...seat, x: ox + dx, y: oy - dy };
      });
      const fixed: Box[] = [
        { x: 0, y: 0, w: width, h: CAPTION_PX },
        { x: ox - 22, y: oy - 22, w: 44, h: 66 },
      ];
      const labels = placeLabels(ctx, placed, p.live, m, fixed, width, height);
      const taken = [
        ...fixed,
        ...placed.map((s) => chipBox(s, m.chip)),
        ...labels.map((l) => l.box),
      ];
      const extent = Math.max(2, ...p.seats.map((s) => s.distanceM)) + 0.5;

      drawRings(ctx, ox, oy, pxPerM, extent, taken, width);
      if (placed.length > 0) drawTable(ctx, ox, oy, pxPerM, placed);
      drawBands(ctx, ox, oy, pxPerM, eased, p.chatterAudible && !still ? now : null);
      if (p.live && p.previewReach) drawPreview(ctx, ox, oy, p.previewReach.well * pxPerM);

      if (p.rippleAt !== lastRipple) {
        lastRipple = p.rippleAt;
        if (!still) ripples.push(now);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const age = now - (ripples[i] ?? now);
        if (age > RIPPLE_MS) {
          ripples.splice(i, 1);
          continue;
        }
        drawRipple(ctx, ox, oy, pxPerM, eased.well, age / RIPPLE_MS);
      }

      for (const label of labels) drawSeat(ctx, label, p.live, m);
      drawTalker(ctx, ox, oy);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hi-tablemap__canvas"
      role="img"
      aria-label={props.description}
    />
  );
}

function seatPoint(seat: Seat, fan: number, pxPerM: number): [number, number] {
  const a = (seat.angleDeg * fan * Math.PI) / 180;
  return [seat.distanceM * Math.sin(a) * pxPerM, seat.distanceM * Math.cos(a) * pxPerM];
}

/**
 * Pixels per meter, and how far the fan of seats closes to earn them. At least
 * two meters fit above the talker, the farthest chip clears the caption band,
 * and the widest seat label stays inside the edge. A narrow plane closes the
 * fan only while that buys scale and no two chips come to touch.
 */
function fitSeats(seats: Seat[], ox: number, oy: number, chip: number, labelHalf: number) {
  const scaleFor = (fan: number) => {
    let maxY = 0;
    let maxX = 0;
    for (const s of seats) {
      const [x, y] = seatPoint(s, fan, 1);
      maxY = Math.max(maxY, y);
      maxX = Math.max(maxX, Math.abs(x));
    }
    return Math.min(
      (oy - CAPTION_PX - chip) / Math.max(2, maxY + 0.25),
      (ox - labelHalf) / Math.max(0.75, maxX + 0.2),
    );
  };
  const closestPair = (fan: number, pxPerM: number) => {
    let closest = Infinity;
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const a = seats[i];
        const b = seats[j];
        if (!a || !b) continue;
        const [ax, ay] = seatPoint(a, fan, pxPerM);
        const [bx, by] = seatPoint(b, fan, pxPerM);
        closest = Math.min(closest, Math.hypot(ax - bx, ay - by));
      }
    }
    return closest;
  };

  let fan = 1;
  let pxPerM = scaleFor(1);
  const touching = 2 * chip + 4;
  const openPair = closestPair(1, pxPerM);
  for (let f = 0.95; f >= 0.35; f -= 0.05) {
    const s = scaleFor(f);
    if (s <= pxPerM * 1.02) break;
    const pair = closestPair(f, s);
    if (pair < touching && pair < openPair) break;
    fan = f;
    pxPerM = s;
  }
  return { fan, pxPerM };
}

/**
 * Each seat's label goes below its chip unless that touches something, then
 * above, right or left, whichever is clear; failing all four, the least
 * crowded. Farther seats are placed first, so a near seat yields to them.
 */
function placeLabels(
  ctx: CanvasRenderingContext2D,
  seats: PlacedSeat[],
  live: boolean,
  m: Metrics,
  fixed: Box[],
  width: number,
  height: number,
): SeatLabel[] {
  const taken = [...fixed, ...seats.map((s) => chipBox(s, m.chip))];
  const labels: SeatLabel[] = [];
  for (const seat of [...seats].sort((a, b) => a.y - b.y)) {
    const lines = labelLines(seat, live, m.lines);
    const w = Math.max(...lines.map((text, i) => measure(ctx, text, lineFont(m, i))));
    const h = lines.reduce((sum, _, i) => sum + lineHeight(m, i), 0);
    const candidates = SIDES.map((side) => {
      const box = boxBeside(seat, m, side, w, h);
      const cost = taken.reduce((sum, o) => sum + overlap(box, o), 0) + outside(box, width, height);
      return { side, box, cost };
    });
    const pick =
      candidates.find((c) => c.cost === 0) ??
      candidates.reduce((a, b) => (b.cost < a.cost ? b : a));
    labels.push({ seat, lines, box: pick.box, side: pick.side });
    taken.push(pick.box);
  }
  return labels;
}

function labelLines(seat: Seat, live: boolean, lines: 1 | 2): string[] {
  const name = seat.label.length > 12 ? `${seat.label.slice(0, 11)}…` : seat.label;
  const state = live ? seat.state : null;
  const word = state ? SEAT_WORD[state] : HEARING_SHORT[seat.hearing];
  return lines === 1 ? [state ? word : name] : [name, word];
}

function boxBeside(seat: PlacedSeat, m: Metrics, side: Side, w: number, h: number): Box {
  const r = m.chip + m.gap;
  const boxes: Record<Side, Box> = {
    below: { x: seat.x - w / 2, y: seat.y + r, w, h },
    above: { x: seat.x - w / 2, y: seat.y - r - h, w, h },
    right: { x: seat.x + r, y: seat.y - h / 2, w, h },
    left: { x: seat.x - r - w, y: seat.y - h / 2, w, h },
  };
  return boxes[side];
}

function chipBox(seat: PlacedSeat, chip: number): Box {
  return { x: seat.x - chip - 2, y: seat.y - chip - 2, w: 2 * chip + 4, h: 2 * chip + 4 };
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function outside(box: Box, width: number, height: number): number {
  return box.w * box.h - overlap(box, { x: 0, y: 0, w: width, h: height });
}

function measure(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  ctx.font = font;
  return ctx.measureText(text).width;
}

function lineFont(m: Metrics, line: number): string {
  return line === 0 ? `560 ${m.nameFont}px ${FONT}` : `500 ${m.wordFont}px ${FONT}`;
}

function lineHeight(m: Metrics, line: number): number {
  return (line === 0 ? m.nameFont : m.wordFont) + 5;
}

function drawRings(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pxPerM: number,
  extent: number,
  taken: Box[],
  width: number,
) {
  ctx.lineWidth = 1;
  ctx.font = `500 13px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const crowded = pxPerM * 0.5 < 42;
  for (let r = 0.5; r <= extent + 1e-9; r += 0.5) {
    const px = r * pxPerM;
    ctx.strokeStyle = `rgba(${CREAM}, 0.09)`;
    ctx.beginPath();
    ctx.arc(ox, oy, px, 0, Math.PI * 2);
    ctx.stroke();
    if (crowded && r % 1 !== 0) continue;
    // A ruler along the talker's baseline: each label just inside its ring, on whichever side is clear.
    const text = `${r} m`;
    const w = ctx.measureText(text).width;
    const y = oy + 4;
    const spot = [
      { x: ox - px + 6, y, w, h: RING_LABEL_H },
      { x: ox + px - 6 - w, y, w, h: RING_LABEL_H },
    ].find(
      (box) =>
        box.x >= 4 && box.x + box.w <= width - 4 && taken.every((o) => overlap(box, o) === 0),
    );
    if (!spot) continue;
    ctx.fillStyle = `rgba(${CREAM}, 0.42)`;
    ctx.fillText(text, spot.x, spot.y + RING_LABEL_H / 2);
  }
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pxPerM: number,
  seats: Seat[],
) {
  const near = Math.max(0.4, Math.min(...seats.map((s) => s.distanceM)) - 0.3);
  const far = Math.max(...seats.map((s) => s.distanceM)) + 0.25;
  const halfWidth =
    Math.max(
      0.6,
      ...seats.map((s) => Math.abs(s.distanceM * Math.sin((s.angleDeg * Math.PI) / 180))),
    ) + 0.3;
  ctx.strokeStyle = `rgba(${CREAM}, 0.16)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(
    ox,
    oy - ((near + far) / 2) * pxPerM,
    halfWidth * pxPerM,
    ((far - near) / 2) * pxPerM,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pxPerM: number,
  radii: Record<Hearing, number>,
  pulseClock: number | null,
) {
  for (const [hearing, alpha] of BANDS) {
    const r = radii[hearing] * pxPerM;
    if (r < 2) continue;
    const inner = r / EDGE;
    const outer = r * EDGE;
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, outer);
    grad.addColorStop(0, `rgba(${REACH}, ${alpha})`);
    grad.addColorStop(inner / outer, `rgba(${REACH}, ${alpha})`);
    grad.addColorStop(1, `rgba(${REACH}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, outer, 0, Math.PI * 2);
    ctx.fill();
  }
  const edge = radii.well * pxPerM;
  if (edge < 2) return;
  const pulse =
    pulseClock === null ? 0 : 0.14 * (0.5 + 0.5 * Math.sin((pulseClock / 1000) * Math.PI * 2));
  ctx.strokeStyle = `rgba(${REACH}, ${0.5 + pulse})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ox, oy, edge, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPreview(ctx: CanvasRenderingContext2D, ox: number, oy: number, radius: number) {
  ctx.save();
  ctx.setLineDash([6, 9]);
  ctx.strokeStyle = `rgba(${REACH}, 0.55)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ox, oy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRipple(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pxPerM: number,
  reachM: number,
  progress: number,
) {
  const eased = 1 - (1 - progress) * (1 - progress);
  const radius = (0.25 + Math.max(0, reachM - 0.25) * eased) * pxPerM;
  ctx.strokeStyle = `rgba(${REACH}, ${0.45 * (1 - progress)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox, oy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSeat(
  ctx: CanvasRenderingContext2D,
  { seat, lines, box, side }: SeatLabel,
  live: boolean,
  m: Metrics,
) {
  const state = live ? seat.state : null;
  const filled = state === "hears";
  const dim = state === "far";
  ctx.beginPath();
  ctx.arc(seat.x, seat.y, m.chip, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = `rgb(${CREAM})`;
    ctx.fill();
  } else {
    ctx.fillStyle = BG;
    ctx.fill();
    ctx.strokeStyle = `rgba(${CREAM}, ${dim ? 0.35 : 0.85})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.font = `650 ${m.initialsFont}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = filled ? BG : `rgba(${CREAM}, ${dim ? 0.55 : 1})`;
  ctx.fillText(initials(seat.label), seat.x, seat.y + 1);

  ctx.textAlign = side === "right" ? "left" : side === "left" ? "right" : "center";
  const x = side === "right" ? box.x : side === "left" ? box.x + box.w : box.x + box.w / 2;
  let top = box.y;
  lines.forEach((text, i) => {
    const h = lineHeight(m, i);
    ctx.font = lineFont(m, i);
    ctx.fillStyle =
      i === 0 ? `rgba(${CREAM}, ${dim ? 0.6 : 0.95})` : `rgba(${CREAM}, ${dim ? 0.5 : 0.7})`;
    ctx.fillText(text, x, top + h / 2);
    top += h;
  });
}

function drawTalker(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.beginPath();
  ctx.arc(ox, oy, TALKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = BG;
  ctx.fill();
  ctx.strokeStyle = `rgb(${CREAM})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = `560 14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(${CREAM}, 0.85)`;
  ctx.fillText("You", ox, oy + 34);
}
