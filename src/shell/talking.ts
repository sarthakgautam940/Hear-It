"use client";

import type { MicrophoneFailure } from "@/platform/audio";
import { engine, type LiveStatus } from "@/platform/engine";
import { sessionsStore } from "@/platform/storage";
import { openNight } from "./overlays";

/** Ends the conversation; when it held a sentence, its report opens. */
export async function stopTalking(): Promise<void> {
  const spoke = engine.getSnapshot().utteranceCount > 0;
  await engine.stop();
  const latest = sessionsStore.get()[0];
  if (spoke && latest) openNight(latest.id);
}

export const STATUS_WORD: Record<LiveStatus, string> = {
  off: "Ready",
  starting: "Starting",
  listening: "Listening",
  boosting: "Boosting",
  "not-needed": "Chatter not needed",
  paused: "Paused",
};

/** What to do when the microphone will not open, by the reason it gave. */
export const MIC_HELP: Record<MicrophoneFailure, string> = {
  denied: "Allow the microphone for this site in your browser settings, then try again.",
  busy: "Another app is using the microphone. Close it, then try again.",
  unsupported:
    "This browser cannot open the microphone. Use Safari on iPhone or Chrome on Android.",
  unknown: "Try again. If it keeps failing, reload the page.",
};
