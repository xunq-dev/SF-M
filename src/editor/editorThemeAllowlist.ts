import { PACK_THEME_IDS } from "./monacoThemePack";
import { SHELL_MATCHED_EDITOR_THEME_IDS } from "./shellMatchedEditorThemes";

export const EDITOR_THEME_BUILTIN_IDS = ["vs-dark", "vs", "hc-black", "hc-light"] as const;

export const DEFAULT_EDITOR_THEME_ID = "tomorrow-night-eighties";

const ALL = new Set<string>([
  ...EDITOR_THEME_BUILTIN_IDS,
  ...PACK_THEME_IDS,
  ...SHELL_MATCHED_EDITOR_THEME_IDS,
]);

export function isAllowedEditorThemeId(id: string): boolean {
  return ALL.has(id);
}

export function normalizeEditorMonacoThemeId(raw: unknown): string {
  if (typeof raw === "string" && isAllowedEditorThemeId(raw)) return raw;
  return DEFAULT_EDITOR_THEME_ID;
}
