/*
  The table drawing's colors and line weights. The drawing is the same in both
  themes, a lit object on the page, so its colors live in their own tokens.
  Marigold appears only where the voice is: your place and the places it reaches.
*/
export const ART = {
  ink: "var(--art-ink)",
  shadow: "var(--art-shadow)",
  cloth: "var(--art-cloth)",
  clothLine: "var(--art-cloth-line)",
  mat: "var(--art-mat)",
  matLine: "var(--art-mat-line)",
  porcelain: "var(--art-porcelain)",
  glaze: "var(--art-glaze)",
  glass: "var(--art-glass)",
  wood: "var(--art-wood)",
  woodDark: "var(--art-wood-dark)",
  cushion: "var(--art-cushion)",
  terracotta: "var(--art-terracotta)",
  burgundy: "var(--art-burgundy)",
  crust: "var(--art-crust)",
  crustDark: "var(--art-crust-dark)",
  wheat: "var(--art-wheat)",
  cream: "var(--art-cream)",
  coral: "var(--art-coral)",
  charcoal: "var(--art-charcoal)",
  stone: "var(--art-stone)",
  rose: "var(--art-rose)",
  oat: "var(--art-oat)",
  soil: "var(--art-soil)",
  voice: "var(--marigold)",
  voiceSoft: "var(--marigold-soft)",
} as const;

export const SKIN = {
  fair: "var(--art-skin-1)",
  warm: "var(--art-skin-2)",
  tan: "var(--art-skin-3)",
  deep: "var(--art-skin-4)",
} as const;

/** Each hair color with the darker tone its strands are drawn in. */
export const HAIR = {
  white: { fill: "var(--art-hair-white)", line: "var(--art-hair-white-line)" },
  silver: { fill: "var(--art-hair-silver)", line: "var(--art-hair-silver-line)" },
  gray: { fill: "var(--art-hair-gray)", line: "var(--art-hair-gray-line)" },
  black: { fill: "var(--art-hair-black)", line: "var(--art-hair-black-line)" },
  chestnut: { fill: "var(--art-hair-chestnut)", line: "var(--art-hair-chestnut-line)" },
  auburn: { fill: "var(--art-hair-auburn)", line: "var(--art-hair-auburn-line)" },
} as const;

/** Outlines, and the finer detail inside them. */
export const LINE = 1.2;
export const DETAIL = 0.8;
