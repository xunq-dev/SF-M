import type { CSSProperties } from "react";
import type { ScriptListThemeTokens } from "./ScriptListThemeTokens";
import type { SurfaceElementsThemeState } from "@/ui/shellTheme";

export type ScriptListThemeVariant = "v3" | "og" | "sx" | "shell";

export function scriptListTokensFromSurfaceElements(se: SurfaceElementsThemeState): ScriptListThemeTokens {
  return {
    sectionHeaderBg: se.surfaceHeaderBackground,
    sectionHeaderText: se.surfaceHeaderText,
    sectionIcon: se.surfaceSectionIcon,
    searchBg: se.surfaceSearchBackground,
    searchPlaceholder: se.surfaceSearchPlaceholder,
    rowText: se.surfaceListText,
    rowHoverBg: se.surfaceListHoverBackground,
    rowMutedText: se.surfaceRowMutedText,
  };
}

/** Map script-list tokens to CSS custom properties for a UI variant. */
export function useScriptListThemeVars(
  variant: ScriptListThemeVariant,
  tokens: ScriptListThemeTokens,
): CSSProperties {
  const prefix =
    variant === "v3"
      ? "--v3-script"
      : variant === "og"
        ? "--og-script"
        : variant === "sx"
          ? "--sx-script"
          : "--shell-script";

  return {
    [`${prefix}-section-bg`]: tokens.sectionHeaderBg,
    [`${prefix}-section-text`]: tokens.sectionHeaderText,
    [`${prefix}-section-icon`]: tokens.sectionIcon,
    [`${prefix}-search-bg`]: tokens.searchBg,
    [`${prefix}-search-placeholder`]: tokens.searchPlaceholder,
    [`${prefix}-row-text`]: tokens.rowText,
    [`${prefix}-row-hover`]: tokens.rowHoverBg,
    [`${prefix}-row-muted`]: tokens.rowMutedText,
  } as CSSProperties;
}

export function scriptListLiveAttr(
  variant: ScriptListThemeVariant,
  path: keyof ScriptListThemeTokens,
): Record<string, string> {
  const dotted =
    variant === "shell"
      ? `surfaceElementsTheme.${surfacePathForToken(path)}`
      : `scriptList.${path}`;
  const attr =
    variant === "v3"
      ? "data-v3-live"
      : variant === "og"
        ? "data-og-live"
        : variant === "sx"
          ? "data-sx-live"
          : "data-shell-live";
  return { [attr]: dotted };
}

function surfacePathForToken(path: keyof ScriptListThemeTokens): string {
  switch (path) {
    case "sectionHeaderBg":
      return "surfaceHeaderBackground";
    case "sectionHeaderText":
      return "surfaceHeaderText";
    case "sectionIcon":
      return "surfaceSectionIcon";
    case "searchBg":
      return "surfaceSearchBackground";
    case "searchPlaceholder":
      return "surfaceSearchPlaceholder";
    case "rowText":
      return "surfaceListText";
    case "rowHoverBg":
      return "surfaceListHoverBackground";
    case "rowMutedText":
      return "surfaceRowMutedText";
  }
}

export function scriptListCssVar(
  variant: ScriptListThemeVariant,
  token: keyof ScriptListThemeTokens,
): string {
  const map: Record<keyof ScriptListThemeTokens, string> = {
    sectionHeaderBg: "section-bg",
    sectionHeaderText: "section-text",
    sectionIcon: "section-icon",
    searchBg: "search-bg",
    searchPlaceholder: "search-placeholder",
    rowText: "row-text",
    rowHoverBg: "row-hover",
    rowMutedText: "row-muted",
  };

  const prefix =
    variant === "v3"
      ? "--v3-script"
      : variant === "og"
        ? "--og-script"
        : variant === "sx"
          ? "--sx-script"
          : "--shell-script";

  return `var(${prefix}-${map[token]})`;
}
