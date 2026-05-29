const INACTIVE = "#414141";
const ACTIVE = "#3149E8";

/** Attach success dot — similar perceived lightness to ACTIVE (~L* 52–56) */
const ATTACH_COMPLETE_GREEN = "#2DBD6F";

/** Optional overrides for attach horizontal bar dots (defaults match constants above). */
export type AttachBarDotColors = {
  inactive: string;
  active: string;
  complete: string;
};

/** Eased-bar distance (0–1) over which an attach dot eases in after the bar reaches it */
const ATTACH_DOT_FADE = 0.095;

function hexToRgb(hex: string) {
  const n = hex.slice(1);
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  };
}

function lerpHex(from: string, to: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * k);
  const g = Math.round(a.g + (b.g - a.g) * k);
  const bl = Math.round(a.b + (b.b - a.b) * k);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function smoothstep01(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Softer than smoothstep for color fades: quick lift off inactive, gentle settle on active. */
function easeOutCubic01(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return 1 - (1 - k) ** 3;
}

function easeInCubic(u: number): number {
  return u * u * u;
}

/**
 * Init vertical bar: one ease-in per segment between the four circles (3 segments).
 */
export function initBarProgressEased(linearT: number): number {
  const segments = 3;
  if (linearT <= 0) return 0;
  if (linearT >= 1) return 1;
  const idx = Math.min(Math.floor(linearT * segments), segments - 1);
  const u = linearT * segments - idx;
  return (idx + easeInCubic(u)) / segments;
}

export type InitStepDotColors = { inactive: string; active: string };

/** Fraction of eased fill (0–1) over which each init dot eases inactive → active after the bar reaches it. */
const INIT_DOT_FADE = 0.09;

/**
 * Init circles: after the eased bar reaches each dot, blend inactive → active over INIT_DOT_FADE
 * (matches attach row feel; avoids a hard snap on segment boundaries).
 */
export function initCircleFill(
  index: number,
  linearT: number,
  dotColors?: InitStepDotColors,
): string {
  const inactive = dotColors?.inactive ?? INACTIVE;
  const active = dotColors?.active ?? ACTIVE;
  const p = initBarProgressEased(linearT);

  if (index === 0) {
    if (p <= 0) return inactive;
    if (p >= INIT_DOT_FADE) return active;
    return lerpHex(inactive, active, easeOutCubic01(p / INIT_DOT_FADE));
  }
  if (index === 3) {
    const start = 1 - INIT_DOT_FADE;
    if (p < start) return inactive;
    if (p >= 1) return active;
    return lerpHex(inactive, active, easeOutCubic01((p - start) / (1 - start)));
  }
  const hit = index / 3;
  if (p <= hit) return inactive;
  if (p >= hit + INIT_DOT_FADE) return active;
  return lerpHex(inactive, active, easeOutCubic01((p - hit) / INIT_DOT_FADE));
}

/** Loading text step (0..2) from eased bar fill — same thirds as circle thresholds */
export function initStepFromBar(linearT: number): number {
  const p = initBarProgressEased(linearT);
  if (p < 1 / 3) return 0;
  if (p < 2 / 3) return 1;
  return 2;
}

/**
 * Attach horizontal bar: smoothstep so velocity eases to **zero** at 0 and 1.
 * (Intro uses piecewise ease-in cubics, which still have noticeable speed into the
 * final frame — attach reads smoother with a coast-in at the end.)
 */
export function attachBarProgressEased(linearT: number): number {
  return smoothstep01(linearT);
}

/**
 * Attach circles: stay gray until the eased bar reaches the dot, then ease into blue
 * (last dot eases into green in the final segment before full fill).
 */
export function attachCircleFill(
  index: number,
  linearT: number,
  colors?: AttachBarDotColors,
): string {
  const inactive = colors?.inactive ?? INACTIVE;
  const active = colors?.active ?? ACTIVE;
  const complete = colors?.complete ?? ATTACH_COMPLETE_GREEN;
  const p = attachBarProgressEased(linearT);
  const target = index >= 8 ? complete : active;

  if (index < 8) {
    const hit = index / 8;
    if (p <= hit) return inactive;
    const u = (p - hit) / ATTACH_DOT_FADE;
    return lerpHex(inactive, target, easeOutCubic01(u));
  }

  const hitLast = 1 - ATTACH_DOT_FADE;
  if (p <= hitLast) return inactive;
  const u = (p - hitLast) / ATTACH_DOT_FADE;
  return lerpHex(inactive, complete, easeOutCubic01(u));
}

/** Attach card step: left → middle → right, locked to same eased thirds as the bar */
export function attachStepFromBar(linearT: number): number {
  const p = attachBarProgressEased(linearT);
  if (p < 1 / 3) return 0;
  if (p < 2 / 3) return 1;
  return 2;
}
