/*
  The arithmetic behind a swipe row, kept apart from the component so it can be
  tested: how far the row follows the finger, where it goes when let go, and the
  spring that carries it there.
*/

/** Letting go past this share of the row's width runs the destructive action. */
export const THROUGH_SHARE = 0.6;
/** How much of a pull past the open position a row gives when it cannot be swiped through. */
const STRETCH = 0.3;
/** A flick this fast, in px/ms, opens or closes the row wherever it is let go. */
const FLICK = 0.45;

export type Settle = "open" | "closed" | "through";

/** Where a row goes when it is let go at `offset` (negative is open) moving at `velocity` px/ms. */
export function settle(
  offset: number,
  velocity: number,
  width: number,
  openWidth: number,
  through: boolean,
): Settle {
  const pulled = -offset;
  if (through && pulled > width * THROUGH_SHARE) return "through";
  if (velocity < -FLICK) return "open";
  if (velocity > FLICK) return "closed";
  return pulled > openWidth / 2 ? "open" : "closed";
}

/** How far the row moves for a finger that has moved `raw` from where the row started. */
export function follow(raw: number, openWidth: number, through: boolean): number {
  if (raw > 0) return raw * STRETCH * 0.5;
  if (through || -raw <= openWidth) return raw;
  return -openWidth + (raw + openWidth) * STRETCH;
}

/**
 * Springs a value to `to`, starting at `velocity` px/ms, and reports each frame.
 * A touch under critical damping: a thrown row overshoots a hair and settles.
 */
export function spring(
  from: number,
  to: number,
  velocity: number,
  frame: (x: number) => void,
  done: () => void,
): () => void {
  const stiffness = 420;
  const damping = 2 * Math.sqrt(stiffness) * 0.82;
  let x = from;
  let v = velocity * 1000;
  let last = performance.now();
  let raf = requestAnimationFrame(function step(now) {
    let dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240);
      v += (-stiffness * (x - to) - damping * v) * h;
      x += v * h;
      dt -= h;
    }
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 12) {
      frame(to);
      done();
      return;
    }
    frame(x);
    raf = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(raf);
}
