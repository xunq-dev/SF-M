/**
 * SVG paths for sidebar nav “pills”: rounded rects with optional concave
 * top/bottom joints (inverse-radius) between stacked items.
 */

export const SIDEBAR_NAV_CELL_W = 60;
export const SIDEBAR_NAV_CELL_H = 64;

/** @returns Pill box inside one 60×64 cell from horizontal / vertical insets */
export function sidebarNavPillBox(insetH: number, insetV: number): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const ih = Math.max(0, insetH);
  const iv = Math.max(0, insetV);
  return {
    x: ih,
    y: iv,
    w: SIDEBAR_NAV_CELL_W - 2 * ih,
    h: SIDEBAR_NAV_CELL_H - 2 * iv,
  };
}

function clampRadius(r: number, w: number, h: number): number {
  const max = Math.min(w, h) / 2 - 0.25;
  return Math.min(Math.max(0, r), max);
}

/** Plain rounded rectangle (inactive / hover / active when notches off). */
export function sidebarNavRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = clampRadius(r, w, h);
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;
  if (rr < 0.5) {
    return `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
  }
  return [
    `M ${x0 + rr} ${y0}`,
    `H ${x1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1} ${y0 + rr}`,
    `V ${y1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}`,
    `H ${x0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0} ${y1 - rr}`,
    `V ${y0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y0}`,
    "Z",
  ].join(" ");
}

function maxNotchSpread(w: number, r: number): number {
  return Math.max(0, (w - 2 * r) / 2 - 2);
}

/** When notch depth > 0, enforce a minimum horizontal span so quadratics are not degenerate. */
function effectiveNotchSpread(
  requested: number,
  w: number,
  rr: number,
  depth: number,
): number {
  const cap = maxNotchSpread(w, rr);
  let s = Math.min(Math.max(0, requested), cap);
  if (depth > 0 && cap > 0) {
    const floor = Math.min(4, cap);
    s = Math.max(s, floor);
    s = Math.min(s, cap);
  }
  return s;
}

function clampTrailingDepth(depth: number, w: number, rr: number): number {
  const cap = Math.max(0, w - rr - 4);
  return Math.min(Math.max(0, depth), cap);
}

/** Max vertical span for each top/bottom scoop on the right (content) edge. */
function maxTrailingSpan(yTop: number, yBottom: number): number {
  return Math.max(0, (yBottom - yTop) / 2 - 1);
}

/**
 * Active pill with optional concave scoops:
 * - Top/bottom **horizontal** edges: inverse-radius joints with the row above/below.
 * - Optional **right** edge: concave scoops toward the main content (vertical edge “bites” inward).
 *
 * When all notch depths are 0, this matches a plain rounded rectangle (same as `sidebarNavRoundedRectPath`).
 */
export function sidebarNavActivePillPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  notchTop: number,
  notchBottom: number,
  spreadTop: number,
  spreadBottom: number,
  trailingDepthPx = 0,
  trailingSpanPx = 0,
): string {
  const rr = clampRadius(r, w, h);
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;
  const mx = x + w / 2;
  const nt = Math.min(Math.max(0, notchTop), rr + 10);
  const nb = Math.min(Math.max(0, notchBottom), rr + 10);
  const st = effectiveNotchSpread(spreadTop, w, rr, nt);
  const sb = effectiveNotchSpread(spreadBottom, w, rr, nb);
  const yRT = y0 + rr;
  const yRB = y1 - rr;
  const trd = clampTrailingDepth(trailingDepthPx, w, rr);
  const spanMax = maxTrailingSpan(yRT, yRB);
  let trs =
    trd > 0 && spanMax > 0 ? Math.min(Math.max(0, trailingSpanPx), spanMax) : 0;
  if (trd > 0 && trs > 0 && yRT + trs >= yRB - trs) {
    trs = Math.max(0, (yRB - yRT) / 2 - 0.5);
    if (yRT + trs >= yRB - trs) {
      trs = 0;
    }
  }

  if (rr < 0.5) {
    return `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
  }

  const useTopNotch = nt > 0 && st > 0;
  const useBottomNotch = nb > 0 && sb > 0;

  let d = `M ${x0 + rr} ${y0}`;
  if (useTopNotch) {
    d += ` H ${x0 + rr + st}`;
    d += ` Q ${mx} ${y0 + nt} ${x1 - rr - st} ${y0}`;
    d += ` H ${x1 - rr}`;
  } else {
    d += ` H ${x1 - rr}`;
  }
  d += ` A ${rr} ${rr} 0 0 1 ${x1} ${yRT}`;
  if (trd > 0 && trs > 0) {
    d += ` Q ${x1 - trd} ${yRT + trs / 2} ${x1} ${yRT + trs}`;
    d += ` V ${yRB - trs}`;
    d += ` Q ${x1 - trd} ${yRB - trs / 2} ${x1} ${yRB}`;
  } else {
    d += ` V ${yRB}`;
  }
  d += ` A ${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}`;
  if (useBottomNotch) {
    d += ` H ${x1 - rr - sb}`;
    d += ` Q ${mx} ${y1 - nb} ${x0 + rr + sb} ${y1}`;
    d += ` H ${x0 + rr}`;
  } else {
    d += ` H ${x0 + rr}`;
  }
  d += ` A ${rr} ${rr} 0 0 1 ${x0} ${y1 - rr}`;
  d += ` V ${y0 + rr}`;
  d += ` A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y0} Z`;
  return d;
}
