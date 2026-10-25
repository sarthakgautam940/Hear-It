"use client";

import { useEffect, useSyncExternalStore } from "react";
import { engine, type EngineSnapshot } from "@/platform/engine";
import { useStore } from "./useStore";
import {
  calibrationStore,
  listenersStore,
  roomStore,
  selfTestStore,
  settingsStore,
} from "@/platform/storage";

const SERVER_SNAPSHOT = engine.getSnapshot();

export function useEngine(): EngineSnapshot {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => SERVER_SNAPSHOT);
}

/** Keeps the engine fed with the current stores; mounted once in the shell. */
export function useEngineInputs(): void {
  const settings = useStore(settingsStore);
  const calibration = useStore(calibrationStore);
  const listeners = useStore(listenersStore);
  const room = useStore(roomStore);
  const selfTest = useStore(selfTestStore);
  useEffect(() => {
    engine.configure({ settings, calibration, listeners, room, selfTest });
  }, [settings, calibration, listeners, room, selfTest]);
}
