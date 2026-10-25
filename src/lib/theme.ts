export const THEME_KEY = "hearit-theme";
export const MOTION_KEY = "hearit-motion";
export const CONTRAST_KEY = "hearit-contrast";
export const VISION_KEY = "hearit-vision";
export const TEXTSIZE_KEY = "hearit-textsize";

export type ThemeChoice = "paper" | "night" | "system";
export type MotionChoice = "system" | "reduced";
export type ContrastChoice = "system" | "high";
export type VisionChoice = "default" | "cvd";
export type TextSizeChoice = "default" | "large" | "larger";

export const THEME_CHOICES: readonly ThemeChoice[] = ["paper", "night", "system"];
export const MOTION_CHOICES: readonly MotionChoice[] = ["system", "reduced"];
export const CONTRAST_CHOICES: readonly ContrastChoice[] = ["system", "high"];
export const VISION_CHOICES: readonly VisionChoice[] = ["default", "cvd"];
export const TEXTSIZE_CHOICES: readonly TextSizeChoice[] = ["default", "large", "larger"];

/**
 * Stamps every persisted preference on <html> before first paint, so neither
 * theme flashes and text never jumps a size. Each value falls back to its
 * default rather than throwing.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;function g(k,v,f){try{var x=localStorage.getItem(k);return v.indexOf(x)>-1?x:f}catch(e){return f}}
d.dataset.theme=g("${THEME_KEY}",["paper","night","system"],"system");
if(g("${MOTION_KEY}",["reduced"],"")==="reduced")d.dataset.motion="reduced";
if(g("${CONTRAST_KEY}",["high"],"")==="high")d.dataset.contrast="high";
if(g("${VISION_KEY}",["cvd"],"")==="cvd")d.dataset.vision="cvd";
var s=g("${TEXTSIZE_KEY}",["large","larger"],"");if(s)d.dataset.textsize=s;})();`;

export function readPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null && (allowed as readonly string[]).includes(stored)
      ? (stored as T)
      : fallback;
  } catch {
    return fallback;
  }
}

function stamp(attr: string, key: string, value: string, isDefault: boolean): void {
  if (isDefault) delete document.documentElement.dataset[attr];
  else document.documentElement.dataset[attr] = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice lasts for the session.
  }
}

export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the choice lasts for the session.
  }
}

export function applyMotion(motion: MotionChoice): void {
  stamp("motion", MOTION_KEY, motion, motion === "system");
}

export function applyContrast(contrast: ContrastChoice): void {
  stamp("contrast", CONTRAST_KEY, contrast, contrast === "system");
}

export function applyVision(vision: VisionChoice): void {
  stamp("vision", VISION_KEY, vision, vision === "default");
}

export function applyTextSize(size: TextSizeChoice): void {
  stamp("textsize", TEXTSIZE_KEY, size, size === "default");
}

/** Paper or night as the page currently resolves, including the system choice. */
export function resolvedTheme(): "paper" | "night" {
  const theme = document.documentElement.dataset.theme;
  if (theme === "night") return "night";
  if (theme === "paper") return "paper";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
}
