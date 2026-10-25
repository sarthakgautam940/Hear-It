/*
  Shake to undo. The detector is plain arithmetic over motion readings so it
  can be tested; the listener feeds it from the phone's motion sensor, which
  iOS only opens once the person allows it, and only when asked during a tap.
*/

export interface MotionReading {
  /** Acceleration with gravity, in m/s². */
  x: number;
  y: number;
  z: number;
  /** When it was read, in ms. */
  t: number;
}

/** A change this large between two readings, summed over the three axes in m/s², is a jolt. */
export const JOLT = 24;
/** This many jolts close together is a shake. */
export const JOLTS = 3;
export const JOLT_WINDOW_MS = 900;
/** After a shake, another cannot start for this long. */
export const SHAKE_REST_MS = 1500;

/** Returns a function that takes each reading and says whether it completed a shake. */
export function shakeDetector(): (r: MotionReading) => boolean {
  let last: MotionReading | null = null;
  let jolts: number[] = [];
  let restUntil = 0;
  return (r) => {
    const prev = last;
    last = r;
    if (!prev || r.t < restUntil) return false;
    const change = Math.abs(r.x - prev.x) + Math.abs(r.y - prev.y) + Math.abs(r.z - prev.z);
    if (change < JOLT) return false;
    jolts = [...jolts.filter((t) => r.t - t < JOLT_WINDOW_MS), r.t];
    if (jolts.length < JOLTS) return false;
    jolts = [];
    restUntil = r.t + SHAKE_REST_MS;
    return true;
  };
}

type MotionAnswer = "granted" | "denied";
interface MotionPermission {
  requestPermission?: () => Promise<MotionAnswer>;
}

const DENIED_KEY = "hearit.v1.motion-denied";
let asked = false;

function hasMotion(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

/**
 * Asks for the motion sensor where the browser makes a page ask first (iOS).
 * Call it from inside a tap; elsewhere the sensor needs no asking.
 */
export function askForMotion(): void {
  if (asked || !hasMotion()) return;
  const motion = window.DeviceMotionEvent as unknown as MotionPermission;
  if (typeof motion.requestPermission !== "function") return;
  try {
    if (localStorage.getItem(DENIED_KEY) === "1") return;
  } catch {
    // Storage can be blocked; asking again is harmless.
  }
  asked = true;
  motion
    .requestPermission()
    .then((answer) => {
      if (answer !== "denied") return;
      try {
        localStorage.setItem(DENIED_KEY, "1");
      } catch {
        // Nothing to remember it in; the browser keeps its own answer.
      }
    })
    .catch(() => {
      // Not called from a tap after all; the next tap can ask.
      asked = false;
    });
}

/** Calls back on each shake of the phone. Where there is no motion sensor it never does. */
export function onShake(callback: () => void): () => void {
  if (!hasMotion()) return () => {};
  const detect = shakeDetector();
  const listener = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    if (detect({ x: a.x, y: a.y, z: a.z, t: e.timeStamp })) callback();
  };
  window.addEventListener("devicemotion", listener);
  return () => window.removeEventListener("devicemotion", listener);
}
