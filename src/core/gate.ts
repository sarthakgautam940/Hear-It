export type GateState = "idle" | "attack" | "on" | "release";

export interface GateRamp {
  /** 1 opens the chatter to its current level, 0 closes it. */
  to: 0 | 1;
  durationMs: number;
}

export const ATTACK_MS = 40;
export const RELEASE_MS = 150;

/**
 * Four states; a ramp instruction is returned only on a transition, so the
 * caller schedules one linear ramp per edge and nothing clicks.
 */
export function createGate(
  attackMs = ATTACK_MS,
  releaseMs = RELEASE_MS,
): { step(speaking: boolean, tMs: number): { state: GateState; ramp: GateRamp | null } } {
  let state: GateState = "idle";
  let edgeAt = 0;

  return {
    step(speaking: boolean, tMs: number) {
      let ramp: GateRamp | null = null;
      switch (state) {
        case "idle":
          if (speaking) {
            state = "attack";
            edgeAt = tMs;
            ramp = { to: 1, durationMs: attackMs };
          }
          break;
        case "attack":
          if (!speaking) {
            state = "release";
            edgeAt = tMs;
            ramp = { to: 0, durationMs: releaseMs };
          } else if (tMs - edgeAt >= attackMs) {
            state = "on";
          }
          break;
        case "on":
          if (!speaking) {
            state = "release";
            edgeAt = tMs;
            ramp = { to: 0, durationMs: releaseMs };
          }
          break;
        case "release":
          if (speaking) {
            state = "attack";
            edgeAt = tMs;
            ramp = { to: 1, durationMs: attackMs };
          } else if (tMs - edgeAt >= releaseMs) {
            state = "idle";
          }
          break;
      }
      return { state, ramp };
    },
  };
}

export function gateIsOpen(state: GateState): boolean {
  return state === "attack" || state === "on";
}
