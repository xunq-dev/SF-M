import type { UiFontId } from "./uiFontStacks";

/**
 * Clipping risk tiers for global UI `font-family` (see plan: per-font vertical slack).
 * 0 = UI-first neo-grotesque-like; 6 = bundled bitmap (Minecraft Seven) + metric overrides in CSS.
 */
export type UiFontVerticalTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const UI_FONT_VERTICAL_TIER_BY_ID: Record<UiFontId, UiFontVerticalTier> = {
  /* Tier 0 — lowest risk */
  inter: 0,
  system: 0,
  segoe: 0,
  "segoe-light": 0,
  roboto: 0,
  helvetica: 0,
  "ibm-plex": 0,
  "source-sans": 0,
  "noto-sans": 0,
  avenir: 0,
  "rounded-ui": 0,
  candara: 0,
  optima: 0,
  gill: 0,
  lucida: 0,
  tahoma: 0,

  /* Tier 1 — slightly tall / large x-height sans */
  trebuchet: 1,
  century: 1,
  franklin: 1,
  verdana: 1,

  /* Tier 2 — serifs at small UI px */
  constantia: 2,
  georgia: 2,
  palatino: 2,
  "book-antiqua": 2,
  garamond: 2,
  times: 2,

  /* Tier 3 — monospace / typewriter */
  courier: 3,
  mono: 3,
  typewriter: 3,

  /* Tier 4 — script / handwriting / rough */
  "script-hand": 4,
  "brush-gothic": 4,
  "chalk-marker": 4,
  "kids-fat": 4,
  papyrus: 4,
  comic: 4,

  /* Tier 5 — heavy display / slab / stencil */
  "blocky-poster": 5,
  stencil: 5,
  "western-slab": 5,

  /* Tier 6 — bundled @font-face; CSS may add ascent/descent overrides */
  "minecraft-seven": 6,
};

const TIER_PRESETS: Record<
  UiFontVerticalTier,
  {
    inputMinH: string;
    inputLh: string;
    selectApp: string;
    selectWide: string;
    logoStripMinH: string;
    fitLineLh: string;
    /** Extra px added to effective max height when shrinking ShellFitLine vertically */
    fitLineVertExtraPx: string;
    fitBlockLh: string;
    /** Extra px added to scrollHeight tolerance in ShellFitBlock “box” mode */
    fitBlockScrollExtraPx: string;
  }
> = {
  0: {
    inputMinH: "48px",
    inputLh: "1.62",
    selectApp: "38px",
    selectWide: "44px",
    logoStripMinH: "40px",
    fitLineLh: "1.42",
    fitLineVertExtraPx: "2",
    fitBlockLh: "1.48",
    fitBlockScrollExtraPx: "2",
  },
  1: {
    inputMinH: "50px",
    inputLh: "1.64",
    selectApp: "40px",
    selectWide: "46px",
    logoStripMinH: "42px",
    fitLineLh: "1.44",
    fitLineVertExtraPx: "3",
    fitBlockLh: "1.5",
    fitBlockScrollExtraPx: "3",
  },
  2: {
    inputMinH: "52px",
    inputLh: "1.66",
    selectApp: "42px",
    selectWide: "48px",
    logoStripMinH: "44px",
    fitLineLh: "1.46",
    fitLineVertExtraPx: "4",
    fitBlockLh: "1.54",
    fitBlockScrollExtraPx: "4",
  },
  3: {
    inputMinH: "54px",
    inputLh: "1.66",
    selectApp: "42px",
    selectWide: "48px",
    logoStripMinH: "44px",
    fitLineLh: "1.46",
    fitLineVertExtraPx: "4",
    fitBlockLh: "1.56",
    fitBlockScrollExtraPx: "4",
  },
  4: {
    inputMinH: "60px",
    inputLh: "1.68",
    selectApp: "48px",
    selectWide: "54px",
    logoStripMinH: "48px",
    fitLineLh: "1.54",
    fitLineVertExtraPx: "6",
    fitBlockLh: "1.6",
    fitBlockScrollExtraPx: "6",
  },
  5: {
    inputMinH: "62px",
    inputLh: "1.72",
    selectApp: "50px",
    selectWide: "56px",
    logoStripMinH: "50px",
    fitLineLh: "1.56",
    fitLineVertExtraPx: "8",
    fitBlockLh: "1.62",
    fitBlockScrollExtraPx: "8",
  },
  6: {
    /* Same slack as tier 5; tier 6 is distinguished for optional @font-face metric fixes */
    inputMinH: "62px",
    inputLh: "1.72",
    selectApp: "50px",
    selectWide: "56px",
    logoStripMinH: "50px",
    fitLineLh: "1.56",
    fitLineVertExtraPx: "8",
    fitBlockLh: "1.62",
    fitBlockScrollExtraPx: "8",
  },
};

export function getUiFontVerticalTier(id: UiFontId): UiFontVerticalTier {
  return UI_FONT_VERTICAL_TIER_BY_ID[id] ?? 0;
}

/** CSS custom property names written on `document.documentElement`. */
export const UI_FONT_VERTICAL_CSS_VARS = {
  inputMinH: "--shell-ui-input-min-h",
  inputLh: "--shell-ui-input-lh",
  selectApp: "--shell-ui-select-min-h-app",
  selectWide: "--shell-ui-select-min-h-wide",
  logoStripMinH: "--shell-ui-logo-strip-min-h",
  fitLineLh: "--shell-fit-line-lh",
  fitLineVertExtraPx: "--shell-fit-line-vert-extra-px",
  fitBlockLh: "--shell-fit-block-lh",
  fitBlockScrollExtraPx: "--shell-fit-block-scroll-extra-px",
} as const;

/**
 * Applies tier-based vertical metrics to the document root for CSS and fit hooks.
 */
export function applyUiFontVerticalMetricsToDocument(id: UiFontId): void {
  const tier = getUiFontVerticalTier(id);
  const p = TIER_PRESETS[tier];
  const el = document.documentElement;
  el.setAttribute("data-ui-font-tier", String(tier));
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.inputMinH, p.inputMinH);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.inputLh, p.inputLh);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.selectApp, p.selectApp);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.selectWide, p.selectWide);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.logoStripMinH, p.logoStripMinH);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.fitLineLh, p.fitLineLh);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.fitLineVertExtraPx, p.fitLineVertExtraPx);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.fitBlockLh, p.fitBlockLh);
  el.style.setProperty(UI_FONT_VERTICAL_CSS_VARS.fitBlockScrollExtraPx, p.fitBlockScrollExtraPx);
}

export function readUiFontVerticalCssNumber(varName: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const n = parseFloat(raw.replace(/px/gi, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function readUiFontVerticalCssUnitless(varName: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}
