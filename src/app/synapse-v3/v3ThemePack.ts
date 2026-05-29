import {
  DEFAULT_V3_THEME,
  normalizeV3Theme,
  readV3Theme,
  applyFullV3Theme,
  resetV3Theme,
  writeV3Theme,
  type V3ThemeState,
} from "./v3Theme";

export const V3_THEME_PACK_FORMAT = "synapse-v3-theme" as const;
export const V3_THEME_PACK_VERSION = 1 as const;

export async function exportV3Theme(): Promise<{ ok: true } | { ok: false; error: string }> {
  const theme = readV3Theme();
  const payload = {
    format: V3_THEME_PACK_FORMAT,
    version: V3_THEME_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    theme,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const d = new Date();
  const filename = `synapse-v3-theme-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    return { ok: false, error: "Could not trigger download." };
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return { ok: true };
}

export async function importV3Theme(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file.name.endsWith(".json")) {
    return { ok: false, error: "Please select a .json theme file." };
  }
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as { theme?: unknown } & Record<string, unknown>;
    const raw = parsed.theme ?? parsed;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Invalid theme file — expected a JSON object." };
    }
    applyFullV3Theme(normalizeV3Theme(raw));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not read or parse the theme file." };
  }
}

export function isV3ThemeCustomized(): boolean {
  const theme = readV3Theme();
  return JSON.stringify(theme) !== JSON.stringify(DEFAULT_V3_THEME);
}

export type V3ThemeSectionKey =
  | "shell"
  | "topBar"
  | "editor"
  | "scriptList"
  | "aiSidebar"
  | "aiOverlay"
  | "scriptHub"
  | "actionBar"
  | "icons"
  | "settingsChrome"
  | "accent"
  | "overlay"
  | "loading"
  | "typography"
  | "branding"
  | "all";

export function resetV3ThemeSection(section: V3ThemeSectionKey): V3ThemeState {
  if (section === "all") {
    resetV3Theme();
    return readV3Theme();
  }
  const def = DEFAULT_V3_THEME;
  return writeV3Theme({ [section]: structuredClone(def[section]) } as Partial<V3ThemeState>);
}
