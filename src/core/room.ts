import type { NoiseKind } from "./types";

/** Below this a room reads as quiet whatever its texture. */
export const QUIET_BELOW_DBA = 38;
/** Speech-like modulation sits at syllable rate; a fan or a dishwasher does not. Set in the spike. */
export const VOICES_MODULATION_MIN = 0.35;
export const ROOM_LISTEN_SECONDS = 10;

export function classifyNoise(laeqDba: number, modulation: number): NoiseKind {
  if (laeqDba < QUIET_BELOW_DBA) return "quiet";
  return modulation >= VOICES_MODULATION_MIN ? "voices" : "steady";
}

export const NOISE_KIND_LABEL: Record<NoiseKind, string> = {
  quiet: "quiet",
  voices: "mostly voices",
  steady: "a steady hum",
};
