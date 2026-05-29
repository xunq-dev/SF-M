import { useLayoutEffect, type RefObject } from "react";
import { SHELL_THEME_CHANGED_EVENT } from "@/ui/shellTheme";
import {
  readUiFontVerticalCssNumber,
  readUiFontVerticalCssUnitless,
  UI_FONT_VERTICAL_CSS_VARS,
} from "@/ui/uiFontVerticalTuning";
import { getShellTextStepPx, type UseShellFitLineFontSizeOptions } from "./useShellFitLineFontSize";

export type UseShellFitBlockFontSizeOptions = UseShellFitLineFontSizeOptions & {
  /** Multiplier for `line-height` (unitless, e.g. 1.2). */
  lineHeight?: number;
  /**
   * `box`: shrink until content fits both parent width and height.
   * `widthOnly`: only horizontal overflow is considered (parent may grow vertically).
   */
  fitMode?: "box" | "widthOnly";
};

/**
 * Wrapped copy inside a bounded parent: font-size is (basePx + global text step), then
 * shrinks so content stays within the parent's content box.
 */
export function useShellFitBlockFontSize(
  ref: RefObject<HTMLElement | null>,
  basePx: number,
  deps: ReadonlyArray<unknown>,
  options?: UseShellFitBlockFontSizeOptions,
) {
  const minFloor = options?.minPx ?? 4;
  const explicitLineHeight = options?.lineHeight;
  const fitMode = options?.fitMode ?? "box";

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
      const maxH = Math.max(1, parent.clientHeight - padY);
      const minSize = Math.max(minFloor, Math.min(maxTarget - 0.5, basePx - 4));

      const lineHeight =
        explicitLineHeight ??
        readUiFontVerticalCssUnitless(UI_FONT_VERTICAL_CSS_VARS.fitBlockLh, 1.42);
      const scrollExtra = readUiFontVerticalCssNumber(
        UI_FONT_VERTICAL_CSS_VARS.fitBlockScrollExtraPx,
        0,
      );

      const setPx = (px: number) => {
        el.style.setProperty("font-size", `${px}px`, "important");
        el.style.setProperty("line-height", String(lineHeight), "important");
      };

      const fits = () => {
        const wOk = el.scrollWidth <= maxW + 1;
        if (fitMode === "widthOnly") return wOk;
        return wOk && el.scrollHeight <= maxH + 2 + scrollExtra;
      };

      setPx(maxTarget);
      if (fits()) return;

      let lo = minSize;
      let hi = maxTarget;
      for (let i = 0; i < 24 && hi - lo > 0.35; i++) {
        const mid = (lo + hi) / 2;
        setPx(mid);
        if (fits()) lo = mid;
        else hi = mid;
      }
      setPx(lo);

      let up = lo;
      while (up + 0.4 <= maxTarget) {
        setPx(up + 0.4);
        if (!fits()) {
          setPx(up);
          break;
        }
        up += 0.4;
        lo = up;
      }
      setPx(lo);
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
  }, [ref, basePx, minFloor, explicitLineHeight, fitMode, ...deps]);
}
