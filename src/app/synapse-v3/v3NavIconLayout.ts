import { V3_THEME_CONTROL_VIEW_SIZE } from "./remake-assets/v3FreshIconPaths";

/** Shared vertical center of the 108.5×27 nav rail (slightly above midline for optical balance). */
export const V3_NAV_RAIL_CY = 11.5;

/** Barely perceptible active-tab scale boost shared across all nav glyphs. */
export const V3_NAV_ACTIVE_BOOST = 1.02;

export interface V3NavSlotLayout {
  cx: number;
  cy: number;
  /** Geometric center of path art in its native coordinate space. */
  artCx: number;
  artCy: number;
  baseScale: number;
}

/** Per-slot layout derived from path bounding boxes in the nav rail. */
export const V3_NAV_SLOTS = {
  editor: { cx: 12.5, cy: V3_NAV_RAIL_CY, artCx: 10, artCy: 7.5, baseScale: 1 },
  settings: { cx: 40, cy: V3_NAV_RAIL_CY, artCx: 40, artCy: 9.25, baseScale: 1 },
  theme: {
    cx: 68.5,
    cy: V3_NAV_RAIL_CY,
    artCx: V3_THEME_CONTROL_VIEW_SIZE / 2,
    artCy: V3_THEME_CONTROL_VIEW_SIZE / 2,
    baseScale: 16 / V3_THEME_CONTROL_VIEW_SIZE,
  },
  plugins: { cx: 95.25, cy: V3_NAV_RAIL_CY, artCx: 100, artCy: 9.75, baseScale: 1 },
} as const satisfies Record<string, V3NavSlotLayout>;

export type V3NavSlotId = keyof typeof V3_NAV_SLOTS;

/** ~19.5px total underline width, centered on each slot. */
export const V3_NAV_UNDERLINE_HALF_W = 9.75;

export function navUnderlineSpan(cx: number): [number, number] {
  return [cx - V3_NAV_UNDERLINE_HALF_W, cx + V3_NAV_UNDERLINE_HALF_W];
}

/** Compose: translate(slot) → scale → translate(-artCenter). */
export function navIconTransform(slot: V3NavSlotLayout, isActive: boolean): string {
  const scale = slot.baseScale * (isActive ? V3_NAV_ACTIVE_BOOST : 1);
  return `translate(${slot.cx} ${slot.cy}) scale(${scale}) translate(${-slot.artCx} ${-slot.artCy})`;
}

/** @deprecated Use V3_NAV_SLOTS.theme — kept for any external imports. */
export const V3_THEME_NAV_CX = V3_NAV_SLOTS.theme.cx;
/** @deprecated Use V3_NAV_RAIL_CY — kept for any external imports. */
export const V3_THEME_NAV_CY = V3_NAV_SLOTS.theme.cy;
/** @deprecated Use V3_NAV_SLOTS.theme.baseScale — kept for any external imports. */
export const V3_THEME_NAV_BASE = V3_NAV_SLOTS.theme.baseScale;
/** @deprecated Plugins cube now uses baseScale 1 in V3_NAV_SLOTS.plugins. */
export const V3_NAV_PLUGINS_BASE = V3_NAV_SLOTS.plugins.baseScale;
