"use client";

import { useEffect, useRef } from "react";
import { HEARING_SHORT, initials } from "@/core/listeners";
import type { SeatState } from "@/core/reach";
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

const BG = "#1b1a17";
const CREAM = "245, 243, 236";
const REACH = "226, 196, 138";
const FONT = '"General Sans", -apple-system, "Segoe UI", Roboto, sans-serif';
/* Outer band for a listener who hears well, inner bands for more trouble; stacking brightens the centre. */
const BANDS: ReadonlyArray<readonly [Hearing, number]> = [
  ["well", 0.2],
  ["some", 0.17],
  ["alot", 0.15],
];
/* A 2 dB error in the voice level moves the reach by this factor either way, so the edge fades across it. */
const EDGE = 1.32;
const EASE_MS = 300;
const RIPPLE_MS = 900;
const SEAT_WORD: Record<SeatState, string> = { hears: "hears you", straining: "straining", far: "too far" };

/**
 * The reach map: the talker at the bottom, rings every half metre, the family
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

      const farthest = Math.max(1.5, ...p.seats.map((s) => s.distanceM));
      const extent = farthest + 0.5;
      const ox = width / 2;
      const oy = height - 72;
      const pxPerM = Math.min((oy - 44) / extent, (width / 2 - 60) / (extent * Math.sin((70 * Math.PI) / 180)));

      drawRings(ctx, ox, oy, pxPerM, extent);
      if (p.seats.length > 0) drawTable(ctx, ox, oy, pxPerM, p.seats);
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

      for (const seat of p.seats) drawSeat(ctx, ox, oy, pxPerM, seat, p.live);
      drawTalker(ctx, ox, oy);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="hi-tablemap__canvas" role="img" aria-label={props.description} />;
}

function drawRings(ctx: CanvasRenderingContext2D, ox: number, oy: number, pxPerM: number, extent: number) {
  ctx.lineWidth = 1;
  ctx.font = `500 13px ${FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const labelAngle = (72 * Math.PI) / 180;
  for (let r = 0.5; r <= extent + 1e-9; r += 0.5) {
    const px = r * pxPerM;
    ctx.strokeStyle = `rgba(${CREAM}, 0.09)`;
    ctx.beginPath();
    ctx.arc(ox, oy, px, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${CREAM}, 0.42)`;
    ctx.fillText(`${r} m`, ox - px * Math.sin(labelAngle) - 6, oy - px * Math.cos(labelAngle));
  }
}

function drawTable(ctx: CanvasRenderingContext2D, ox: number, oy: number, pxPerM: number, seats: Seat[]) {
  const near = Math.max(0.4, Math.min(...seats.map((s) => s.distanceM)) - 0.3);
  const far = Math.max(...seats.map((s) => s.distanceM)) + 0.25;
  const halfWidth = Math.max(0.6, ...seats.map((s) => Math.abs(s.distanceM * Math.sin((s.angleDeg * Math.PI) / 180)))) + 0.3;
  ctx.strokeStyle = `rgba(${CREAM}, 0.16)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(ox, oy - ((near + far) / 2) * pxPerM, halfWidth * pxPerM, ((far - near) / 2) * pxPerM, 0, 0, Math.PI * 2);
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
  const pulse = pulseClock === null ? 0 : 0.14 * (0.5 + 0.5 * Math.sin((pulseClock / 1000) * Math.PI * 2));
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

function drawRipple(ctx: CanvasRenderingContext2D, ox: number, oy: number, pxPerM: number, reachM: number, progress: number) {
  const eased = 1 - (1 - progress) * (1 - progress);
  const radius = (0.25 + Math.max(0, reachM - 0.25) * eased) * pxPerM;
  ctx.strokeStyle = `rgba(${REACH}, ${0.45 * (1 - progress)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox, oy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSeat(ctx: CanvasRenderingContext2D, ox: number, oy: number, pxPerM: number, seat: Seat, live: boolean) {
  const a = (seat.angleDeg * Math.PI) / 180;
  const x = ox + seat.distanceM * Math.sin(a) * pxPerM;
  const y = oy - seat.distanceM * Math.cos(a) * pxPerM;
  const radius = 24;
  const state = live ? seat.state : null;
  const filled = state === "hears";
  const dim = state === "far";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
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
  ctx.font = `650 15px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = filled ? BG : `rgba(${CREAM}, ${dim ? 0.55 : 1})`;
  ctx.fillText(initials(seat.label), x, y + 1);

  ctx.font = `560 14px ${FONT}`;
  ctx.fillStyle = `rgba(${CREAM}, ${dim ? 0.6 : 0.95})`;
  ctx.fillText(seat.label.length > 12 ? `${seat.label.slice(0, 11)}…` : seat.label, x, y + radius + 16);
  ctx.font = `500 13px ${FONT}`;
  ctx.fillStyle = `rgba(${CREAM}, ${dim ? 0.5 : 0.7})`;
  ctx.fillText(state ? SEAT_WORD[state] : HEARING_SHORT[seat.hearing], x, y + radius + 34);
}

function drawTalker(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.beginPath();
  ctx.arc(ox, oy, 15, 0, Math.PI * 2);
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
