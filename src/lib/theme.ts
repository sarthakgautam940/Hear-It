export const THEME_KEY = "hearit-theme";
export const TEXTSIZE_KEY = "hearit-textsize";
export const MOTION_KEY = "hearit-motion";
export const ONBOARDED_KEY = "hearit.v1.onboarded";

export type ThemeChoice = "system" | "light" | "dark";
export type TextSizeChoice = "default" | "large" | "larger";
export type MotionChoice = "system" | "reduced";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];
export const TEXTSIZE_CHOICES: readonly TextSizeChoice[] = ["default", "large", "larger"];
export const MOTION_CHOICES: readonly MotionChoice[] = ["system", "reduced"];

/* The device as drawn, in points, plus the margin it keeps from the window edge. */
const DEVICE_W = 430;
const DEVICE_H = 902;
const STAGE_MARGIN = 48;

/**
 * Runs before first paint: stamps every stored preference on <html> so no theme
 * or text size flashes, and fits the drawn phone to the window. Values from the
 * first build ("paper", "night") are carried over.
 */
export const BOOT_SCRIPT = `(function(){var d=document.documentElement;function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
var t=g("${THEME_KEY}");if(t==="paper")t="light";if(t==="night")t="dark";d.dataset.theme=t==="light"||t==="dark"?t:"system";
var s=g("${TEXTSIZE_KEY}");if(s==="large"||s==="larger")d.dataset.textsize=s;
if(g("${MOTION_KEY}")==="reduced")d.dataset.motion="reduced";
if(g("${ONBOARDED_KEY}")==="1")d.dataset.onboarded="1";
function fit(){var k=Math.min(1,(innerHeight-${STAGE_MARGIN})/${DEVICE_H},(innerWidth-${STAGE_MARGIN})/${DEVICE_W});d.style.setProperty("--device-scale",String(Math.max(0.4,k)))}
fit();addEventListener("resize",fit);})();`;

export function readPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const stored = localStorage.getItem(key);
    if (key === THEME_KEY && stored === "paper") return "light" as T;
    if (key === THEME_KEY && stored === "night") return "dark" as T;
    return stored !== null && (allowed as readonly string[]).includes(stored)
      ? (stored as T)
      : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice lasts for the session.
  }
}

function stamp(attr: "textsize" | "motion", value: string | null): void {
  if (value === null) delete document.documentElement.dataset[attr];
  else document.documentElement.dataset[attr] = value;
}

export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  persist(THEME_KEY, theme);
}

export function applyTextSize(size: TextSizeChoice): void {
  stamp("textsize", size === "default" ? null : size);
  persist(TEXTSIZE_KEY, size);
}

export function applyMotion(motion: MotionChoice): void {
  stamp("motion", motion === "reduced" ? "reduced" : null);
  persist(MOTION_KEY, motion);
}

const onboardedListeners = new Set<() => void>();

export function subscribeOnboarded(listener: () => void): () => void {
  onboardedListeners.add(listener);
  return () => onboardedListeners.delete(listener);
}

/* The <html> stamp is the source of truth: the boot script set it before first paint. */
export function isOnboarded(): boolean {
  return document.documentElement.dataset.onboarded === "1";
}

export function markOnboarded(): void {
  document.documentElement.dataset.onboarded = "1";
  persist(ONBOARDED_KEY, "1");
  for (const l of onboardedListeners) l();
}

export function resetOnboarding(): void {
  delete document.documentElement.dataset.onboarded;
  try {
    localStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Private mode: nothing was stored.
  }
  for (const l of onboardedListeners) l();
}

export function resolvedTheme(): "light" | "dark" {
  const theme = document.documentElement.dataset.theme;
  if (theme === "dark" || theme === "light") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
