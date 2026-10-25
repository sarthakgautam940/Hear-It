/** How a listener hears in noise, in their own words. Never a diagnosis. */
export type Hearing = "well" | "some" | "alot";

export type EarMode = "left" | "right" | "both";

export type Sensitivity = "low" | "medium" | "high";

/** 0 is off; 1 to 5 are output steps of 6 dB below the cap. */
export type ChatterLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** A chatter gain in dB relative to the cap, or no chatter at all. */
export type ChatterGain = number | "off";

/** What the room's noise is made of, from its modulation. */
export type NoiseKind = "quiet" | "voices" | "steady";

/** One 20 ms frame from the level processor. Levels are dBFS. */
export interface Frame {
  tMs: number;
  levelDb: number;
  levelADb: number;
  loDb: number;
  hiDb: number;
  f0Hz: number | null;
  clipped: boolean;
}

export interface F0Range {
  lo: number;
  hi: number;
}

export interface Settings {
  chatterLevel: ChatterLevel;
  adaptive: boolean;
  sensitivity: Sensitivity;
  ear: EarMode;
  targetGainDb: number;
}

/** The one place an absolute sound level enters: dBFS plus this offset is dBA at 1 m. */
export interface Calibration {
  offsetDb: number;
  measuredAt: string | null;
}

export interface Listener {
  id: string;
  label: string;
  hearing: Hearing;
  distanceM: number;
}

export interface Room {
  noiseDba: number | null;
  kind: NoiseKind | null;
  alphaDbPerDoubling: number;
  measuredAt: string | null;
}

export interface SelfTestSentence {
  boosted: boolean;
  leqDb: number;
  f0s: number[];
}

export interface SelfTestResult {
  gainDb: number;
  baselineDb: number;
  f0Range: F0Range | null;
  sentences: SelfTestSentence[];
  ear: EarMode;
  measuredAt: string;
}

export interface Utterance {
  startMs: number;
  endMs: number;
  levelDba: number;
  chatterOn: boolean;
  chatterGainDb: number | null;
  clarityDb: number | null;
  inReach: string[];
}

export interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  utterances: Utterance[];
  speechSeconds: number;
  chatterSeconds: number;
  dosePercent: number;
  noiseDba: number | null;
  listenerIds: string[];
}
