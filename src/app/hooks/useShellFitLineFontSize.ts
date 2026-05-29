import { useLayoutEffect, type RefObject } from "react";
import { SHELL_THEME_CHANGED_EVENT } from "@/ui/shellTheme";
import {
  readUiFontVerticalCssNumber,
  readUiFontVerticalCssUnitless,
  UI_FONT_VERTICAL_CSS_VARS,
} from "@/ui/uiFontVerticalTuning";

export function getShellTextStepPx(): number {
  const root = document.documentElement;
  if (!root.hasAttribute("data-shell-text-step-active")) return 0;
  const raw = getComputedStyle(root).getPropertyValue("--shell-text-step-px").trim();
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/px/gi, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Single-line copy: target size is (basePx + global text step); if it overflows the
 * parent width, font shrinks (floor ~4px) so the line stays one row. Uses important
 * so sizing wins over global shell text scale rules.
 */
export type UseShellFitLineFontSizeOptions = {
  /** Floor for fitted font size in px (default 4). */
  minPx?: number;
};

export function useShellFitLineFontSize(
  ref: RefObject<HTMLElement | null>,
  basePx: number,
  deps: ReadonlyArray<unknown>,
  options?: UseShellFitLineFontSizeOptions,
) {
  const minFloor = options?.minPx ?? 4;
  useLayoutEffect(() => {
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const step = getShellTextStepPx();
      const maxTarget = Math.max(5, basePx + step);
      const cs = getComputedStyle(parent);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const maxW = Math.max(1, parent.clientWidth - padX);
      const maxH = parent.clientHeight - padY;
      const minSize = Math.max(minFloor, Math.min(maxTarget - 0.5, basePx - 4));

      const lineLh = readUiFontVerticalCssUnitless(UI_FONT_VERTICAL_CSS_VARS.fitLineLh, 1.38);
      const vertExtra = readUiFontVerticalCssNumber(UI_FONT_VERTICAL_CSS_VARS.fitLineVertExtraPx, 0);

      const setPx = (px: number) => {
        el.style.setProperty("font-size", `${px}px`, "important");
        el.style.setProperty("line-height", String(lineLh), "important");
      };

      setPx(maxTarget);

      if (maxW > 1 && el.scrollWidth > maxW + 1) {
        let lo = minSize;
        let hi = maxTarget;
        for (let i = 0; i < 18 && hi - lo > 0.35; i++) {
          const mid = (lo + hi) / 2;
          setPx(mid);
          if (el.scrollWidth <= maxW + 1) lo = mid;
          else hi = mid;
        }
        setPx(lo);

        /* Use spare width up to the stepped target (same line, slightly larger when room). */
        let up = lo;
        while (up + 0.4 <= maxTarget) {
          setPx(up + 0.4);
          if (el.scrollWidth > maxW + 1) {
            setPx(up);
            break;
          }
          up += 0.4;
          lo = up;
        }
        setPx(lo);
      }

      /* Fixed-height parents (e.g. editor tab chips): shrink until ink fits (scrollHeight catches tall glyphs). */
      if (maxH > 14) {
        const overflowH = () =>
          Math.max(el.scrollHeight, el.offsetHeight, el.getBoundingClientRect().height);
        let v = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(v)) v = maxTarget;
        const limit = maxH + 2 + vertExtra;
        let guard = 0;
        while (v > minSize + 0.15 && overflowH() > limit && guard < 80) {
          v -= 0.3;
          setPx(v);
          guard += 1;
        }
      }
    };

    apply();
    const raf = requestAnimationFrame(() => apply());
    const on = () => apply();
    window.addEventListener("resize", on);
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, on);
    const parent = ref.current?.parentElement;
    const ro = parent ? new ResizeObserver(() => apply()) : null;
    if (parent) ro!.observe(parent);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", on);
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, on);
      ro?.disconnect();
    };
  }, [ref, basePx, minFloor, ...deps]);
}
