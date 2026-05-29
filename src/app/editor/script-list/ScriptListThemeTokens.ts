import type { ScriptListThemeVariant } from "./useScriptListThemeVars";

/** Shared script-list colour tokens (matches V3ThemeScriptList). */
export type ScriptListThemeTokens = {
  sectionHeaderBg: string;
  sectionHeaderText: string;
  sectionIcon: string;
  searchBg: string;
  searchPlaceholder: string;
  rowText: string;
  rowHoverBg: string;
  rowMutedText: string;
};

/** V3 enhanced script list width (unchanged). */
export const ENHANCED_SCRIPT_LIST_WIDTH_PX = 197;

export const SCRIPT_LIST_PANEL_WIDTH: Record<ScriptListThemeVariant, number> = {
  v3: 197,
  shell: 107,
  og: 139,
  sx: 139,
};

export type ScriptListLayoutMetrics = {
  searchHeight: number;
  searchFontSize: number;
  searchIconSize: number;
  gapAfterSearch: number;
  sectionHeaderHeight: number;
  sectionFontSize: number;
  chevronWidth: number;
  chevronHeight: number;
  rowHeight: number;
  rowFontSize: number;
  emptyFontSize: number;
  sectionIconSize: number;
  rowIconSize: number;
  rowActionIconSize: number;
  trailingIconSize: number;
  actionButtonSize: number;
  rowPaddingX: number;
};

const V3_LAYOUT: ScriptListLayoutMetrics = {
  searchHeight: 31,
  searchFontSize: 11,
  searchIconSize: 16,
  gapAfterSearch: 5,
  sectionHeaderHeight: 29,
  sectionFontSize: 16,
  chevronWidth: 10,
  chevronHeight: 7,
  rowHeight: 26,
  rowFontSize: 12,
  emptyFontSize: 11,
  sectionIconSize: 16,
  rowIconSize: 16,
  rowActionIconSize: 14,
  trailingIconSize: 14,
  actionButtonSize: 18,
  rowPaddingX: 8,
};

const SHELL_LAYOUT: ScriptListLayoutMetrics = {
  searchHeight: 20,
  searchFontSize: 9,
  searchIconSize: 10,
  gapAfterSearch: 2,
  sectionHeaderHeight: 18,
  sectionFontSize: 9,
  chevronWidth: 7,
  chevronHeight: 5,
  rowHeight: 16,
  rowFontSize: 9,
  emptyFontSize: 8,
  sectionIconSize: 10,
  rowIconSize: 10,
  rowActionIconSize: 9,
  trailingIconSize: 9,
  actionButtonSize: 14,
  rowPaddingX: 2,
};

const OG_SX_LAYOUT: ScriptListLayoutMetrics = {
  searchHeight: 24,
  searchFontSize: 10,
  searchIconSize: 12,
  gapAfterSearch: 3,
  sectionHeaderHeight: 22,
  sectionFontSize: 11,
  chevronWidth: 8,
  chevronHeight: 6,
  rowHeight: 20,
  rowFontSize: 11,
  emptyFontSize: 9,
  sectionIconSize: 12,
  rowIconSize: 12,
  rowActionIconSize: 11,
  trailingIconSize: 11,
  actionButtonSize: 16,
  rowPaddingX: 4,
};

export function resolveScriptListLayout(variant: ScriptListThemeVariant): ScriptListLayoutMetrics {
  switch (variant) {
    case "v3":
      return V3_LAYOUT;
    case "shell":
      return SHELL_LAYOUT;
    case "og":
    case "sx":
      return OG_SX_LAYOUT;
  }
}
