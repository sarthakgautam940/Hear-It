import { isHearing } from "@/core/listeners";
import { DEFAULT_ALPHA_DB_PER_DOUBLING } from "@/core/reach";
import { isSeatSlot, seatDistanceM, seatEveryone, type SeatSlot } from "@/core/seats";
import type {
  Calibration,
  ChatterLevel,
  EarMode,
  Hearing,
  Listener,
  Room,
  SelfTestResult,
  Sensitivity,
  Session,
  Settings,
} from "@/core/types";

/**
 * Versioned localStorage stores with hand-written validators. Nothing here
 * leaves the device; a value that fails validation falls back to the default
 * rather than crashing a screen.
 */

export interface Store<T> {
  readonly key: string;
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  readonly fallback: T;
}

const PREFIX = "hearit.v1.";

function createStore<T>(name: string, fallback: T, parse: (raw: unknown) => T | null): Store<T> {
  const key = PREFIX + name;
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const read = (): T => {
    if (typeof window === "undefined") return fallback;
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw === null ? fallback : (parse(JSON.parse(raw)) ?? fallback);
    } catch {
      cache = fallback;
    }
    return cache;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        cache = undefined;
        for (const l of listeners) l();
      }
    });
  }

  return {
    key,
    fallback,
    get: read,
    set(next) {
      const value = typeof next === "function" ? (next as (prev: T) => T)(read()) : next;
      cache = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Private mode or a full store: the value lasts for the session.
      }
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNullOrNum = (v: unknown): v is number | null => v === null || isNum(v);
const isNullOrStr = (v: unknown): v is string | null => v === null || isStr(v);
const isEar = (v: unknown): v is EarMode => v === "left" || v === "right" || v === "both";
const isSensitivity = (v: unknown): v is Sensitivity =>
  v === "low" || v === "medium" || v === "high";
const isLevel = (v: unknown): v is ChatterLevel =>
  isNum(v) && Number.isInteger(v) && v >= 0 && v <= 5;

export const DEFAULT_SETTINGS: Settings = {
  chatterLevel: 2,
  adaptive: true,
  sensitivity: "medium",
  ear: "left",
  targetGainDb: 4,
};

export const settingsStore = createStore<Settings>("settings", DEFAULT_SETTINGS, (raw) => {
  if (!isRecord(raw)) return null;
  const s = { ...DEFAULT_SETTINGS };
  if (isLevel(raw.chatterLevel)) s.chatterLevel = raw.chatterLevel;
  if (typeof raw.adaptive === "boolean") s.adaptive = raw.adaptive;
  if (isSensitivity(raw.sensitivity)) s.sensitivity = raw.sensitivity;
  if (isEar(raw.ear)) s.ear = raw.ear;
  if (isNum(raw.targetGainDb)) s.targetGainDb = Math.max(3, Math.min(8, raw.targetGainDb));
  return s;
});

/**
 * Until a meter sets it, the offset is a typical phone microphone's: speech
 * near the chest arrives around -28 dBFS and sits near 60 dBA at 1 m. Every
 * distance drawn from it is labeled estimated.
 */
export const DEFAULT_CALIBRATION: Calibration = { offsetDb: 88, measuredAt: null };

export const calibrationStore = createStore<Calibration>(
  "calibration",
  DEFAULT_CALIBRATION,
  (raw) => {
    if (!isRecord(raw) || !isNum(raw.offsetDb) || !isNullOrStr(raw.measuredAt)) return null;
    return { offsetDb: raw.offsetDb, measuredAt: raw.measuredAt };
  },
);

/* People saved before chairs existed keep their distance and take the free chair nearest it. */
export const listenersStore = createStore<Listener[]>("listeners", [], (raw) => {
  if (!Array.isArray(raw)) return null;
  const read: {
    id: string;
    label: string;
    hearing: Hearing;
    distanceM: number;
    seat?: SeatSlot;
  }[] = [];
  for (const item of raw) {
    if (
      !isRecord(item) ||
      !isStr(item.id) ||
      !isStr(item.label) ||
      !isHearing(item.hearing) ||
      !isNum(item.distanceM)
    ) {
      continue;
    }
    read.push({
      id: item.id,
      label: item.label,
      hearing: item.hearing,
      distanceM: item.distanceM,
      ...(isSeatSlot(item.seat) ? { seat: item.seat } : {}),
    });
  }
  return seatEveryone(read).map((p) => ({ ...p, distanceM: seatDistanceM(p.seat) }));
});

export const DEFAULT_ROOM: Room = {
  noiseDba: null,
  kind: null,
  alphaDbPerDoubling: DEFAULT_ALPHA_DB_PER_DOUBLING,
  measuredAt: null,
};

export const roomStore = createStore<Room>("room", DEFAULT_ROOM, (raw) => {
  if (!isRecord(raw) || !isNullOrNum(raw.noiseDba) || !isNullOrStr(raw.measuredAt)) return null;
  const kind =
    raw.kind === "quiet" || raw.kind === "voices" || raw.kind === "steady" ? raw.kind : null;
  return {
    noiseDba: raw.noiseDba,
    kind,
    alphaDbPerDoubling: isNum(raw.alphaDbPerDoubling)
      ? raw.alphaDbPerDoubling
      : DEFAULT_ALPHA_DB_PER_DOUBLING,
    measuredAt: raw.measuredAt,
  };
});

export const selfTestStore = createStore<SelfTestResult | null>("selftest", null, (raw) => {
  if (!isRecord(raw) || !isNum(raw.gainDb) || !isNum(raw.baselineDb) || !isStr(raw.measuredAt))
    return null;
  const f0 = raw.f0Range;
  const f0Range = isRecord(f0) && isNum(f0.lo) && isNum(f0.hi) ? { lo: f0.lo, hi: f0.hi } : null;
  const sentences = Array.isArray(raw.sentences)
    ? raw.sentences.flatMap((s: unknown) =>
        isRecord(s) && typeof s.boosted === "boolean" && isNum(s.leqDb)
          ? [
              {
                boosted: s.boosted,
                leqDb: s.leqDb,
                f0s: Array.isArray(s.f0s) ? s.f0s.filter(isNum) : [],
                clarityDb: isNum(s.clarityDb) ? s.clarityDb : null,
              },
            ]
          : [],
      )
    : [];
  return {
    gainDb: raw.gainDb,
    baselineDb: raw.baselineDb,
    clarityChangeDb: isNum(raw.clarityChangeDb) ? raw.clarityChangeDb : null,
    f0Range,
    sentences,
    ear: isEar(raw.ear) ? raw.ear : "left",
    measuredAt: raw.measuredAt,
  };
});

export const MAX_SESSIONS = 50;

export const sessionsStore = createStore<Session[]>("sessions", [], (raw) => {
  if (!Array.isArray(raw)) return null;
  const out: Session[] = [];
  for (const s of raw) {
    if (!isRecord(s) || !isStr(s.id) || !isStr(s.startedAt) || !Array.isArray(s.utterances))
      continue;
    out.push({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: isNullOrStr(s.endedAt) ? s.endedAt : null,
      utterances: s.utterances.flatMap((u: unknown) =>
        isRecord(u) &&
        isNum(u.startMs) &&
        isNum(u.endMs) &&
        isNum(u.levelDba) &&
        typeof u.chatterOn === "boolean"
          ? [
              {
                startMs: u.startMs,
                endMs: u.endMs,
                levelDba: u.levelDba,
                chatterOn: u.chatterOn,
                chatterGainDb: isNullOrNum(u.chatterGainDb) ? u.chatterGainDb : null,
                clarityDb: isNullOrNum(u.clarityDb) ? u.clarityDb : null,
                inReach: Array.isArray(u.inReach) ? u.inReach.filter(isStr) : [],
              },
            ]
          : [],
      ),
      speechSeconds: isNum(s.speechSeconds) ? s.speechSeconds : 0,
      chatterSeconds: isNum(s.chatterSeconds) ? s.chatterSeconds : 0,
      dosePercent: isNum(s.dosePercent) ? s.dosePercent : 0,
      noiseDba: isNullOrNum(s.noiseDba) ? s.noiseDba : null,
      listenerIds: Array.isArray(s.listenerIds) ? s.listenerIds.filter(isStr) : [],
    });
  }
  return out;
});

export function rememberSession(session: Session): void {
  sessionsStore.set((prev) =>
    [session, ...prev.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS),
  );
}

export function clearAllData(): void {
  for (const store of [
    settingsStore,
    calibrationStore,
    listenersStore,
    roomStore,
    selfTestStore,
    sessionsStore,
  ]) {
    (store as Store<unknown>).set(store.fallback);
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
