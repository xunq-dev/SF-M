import type * as monaco from "monaco-editor";
import type { V3ThemePresetId } from "@/app/synapse-v3/v3Theme";
import { buildVsDarkShellMonacoTheme } from "./vsDarkShellMonacoTheme";

/** Monaco theme id for user-picked editor background (VS Dark syntax, custom bg). */
export const SHELL_CUSTOM_EDITOR_THEME_ID = "shell-custom";

export const SHELL_MATCHED_EDITOR_THEME_IDS = [
  "shell-framework",
  "shell-midnight",
  "shell-graphite",
  "shell-ocean",
  "shell-ember",
  "shell-high-contrast",
  "shell-novo",
  SHELL_CUSTOM_EDITOR_THEME_ID,
] as const;

export type ShellMatchedEditorThemeId = (typeof SHELL_MATCHED_EDITOR_THEME_IDS)[number];

export const SHELL_EDITOR_THEME_LABELS: Record<string, string> = {
  "shell-framework": "Framework",
  "shell-midnight": "Midnight",
  "shell-graphite": "Graphite",
  "shell-ocean": "Ocean",
  "shell-ember": "Ember",
  "shell-high-contrast": "High Contrast",
  "shell-novo": "Hollywood Novo",
  [SHELL_CUSTOM_EDITOR_THEME_ID]: "Custom Background",
};

const CUSTOM_BG_STORAGE_KEY = "synapse.editorShellCustomBg.v1";

/** VS Dark default editor canvas background. */
export const VS_DARK_EDITOR_BACKGROUND = "#1e1e1e";

/** Shell page backgrounds per quick-look preset (shell chrome, not editor). */
export const PRESET_SHELL_PAGE_BG: Record<V3ThemePresetId, string> = {
  framework: "#151515",
  midnight: "#0a0a0a",
  graphite: "#1f1f1f",
  ocean: "#101c28",
  ember: "#1a1410",
  highContrast: "#000000",
  novo: "#151F2A",
};

/**
 * Explicit Monaco editor canvas colour per preset — must differ visibly.
 * Framework uses standard VS Dark `#1e1e1e` (not a darkened shell page colour).
 */
export const PRESET_EDITOR_BG: Record<V3ThemePresetId, string> = {
  framework: VS_DARK_EDITOR_BACKGROUND,
  midnight: "#060606",
  graphite: "#1a1a1a",
  ocean: "#071018",
  ember: "#140c08",
  highContrast: "#000000",
  novo: "#0a1218",
};

/** @deprecated Use PRESET_EDITOR_BG — kept for shell wrappers that darken page bg. */
export function darkenForEditorBg(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return VS_DARK_EDITOR_BACKGROUND;
  const scale = 0.55;
  const r = Math.round(parseInt(h.slice(0, 2), 16) * scale);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * scale);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * scale);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Monaco editor canvas colour for each preset. */
export function getShellEditorBgForPreset(presetId: V3ThemePresetId): string {
  return PRESET_EDITOR_BG[presetId] ?? PRESET_EDITOR_BG.framework;
}

function presetToThemeId(presetId: V3ThemePresetId): ShellMatchedEditorThemeId {
  if (presetId === "highContrast") return "shell-high-contrast";
  return `shell-${presetId}` as ShellMatchedEditorThemeId;
}

export function shellMatchedThemeIdForPreset(presetId: V3ThemePresetId): ShellMatchedEditorThemeId {
  return presetToThemeId(presetId);
}

const PRESET_THEME_DATA: Record<string, monaco.editor.IStandaloneThemeData> = {};
for (const [preset, pageBg] of Object.entries(PRESET_SHELL_PAGE_BG) as [V3ThemePresetId, string][]) {
  const id = presetToThemeId(preset);
  const editorBg = getShellEditorBgForPreset(preset);
  PRESET_THEME_DATA[id] = buildVsDarkShellMonacoTheme(editorBg);
}

let registered = false;
let lastCustomBg = "#1e1e1e";

export function readShellCustomEditorBg(): string {
  try {
    const raw = localStorage.getItem(CUSTOM_BG_STORAGE_KEY);
    if (raw && /^#[0-9a-f]{6}$/i.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  return lastCustomBg;
}

export function writeShellCustomEditorBg(hex: string): string {
  const v = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#1e1e1e";
  lastCustomBg = v;
  try {
    localStorage.setItem(CUSTOM_BG_STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
  return v;
}

/** Persist custom bg from a quick-look / editor-style preset id. */
export function syncCustomBgFromPreset(presetId: V3ThemePresetId): string {
  return writeShellCustomEditorBg(getShellEditorBgForPreset(presetId));
}

export function shellEditorBgMatchesPreset(customBg: string, presetId: V3ThemePresetId): boolean {
  return customBg.toLowerCase() === getShellEditorBgForPreset(presetId).toLowerCase();
}

export function presetIdForShellEditorBg(hex: string): V3ThemePresetId | null {
  const norm = hex.toLowerCase();
  for (const preset of Object.keys(PRESET_EDITOR_BG) as V3ThemePresetId[]) {
    if (getShellEditorBgForPreset(preset).toLowerCase() === norm) return preset;
  }
  return null;
}

function applyThemeToAllEditors(m: typeof import("monaco-editor"), themeId: string): void {
  m.editor.setTheme(themeId);
  for (const ed of m.editor.getEditors()) {
    try {
      ed.updateOptions({});
    } catch {
      /* ignore */
    }
  }
}

export function registerShellMatchedMonacoThemes(m: typeof import("monaco-editor")): void {
  for (const [id, data] of Object.entries(PRESET_THEME_DATA)) {
    m.editor.defineTheme(id, data);
  }
  const customBg = readShellCustomEditorBg();
  lastCustomBg = customBg;
  m.editor.defineTheme(SHELL_CUSTOM_EDITOR_THEME_ID, buildVsDarkShellMonacoTheme(customBg));
  registered = true;
}

/** Re-define custom theme after color pick and force live Monaco repaint. */
export function updateShellCustomEditorTheme(
  m: typeof import("monaco-editor"),
  backgroundHex: string,
  applyNow = true,
): void {
  const hex = writeShellCustomEditorBg(backgroundHex);
  m.editor.defineTheme(SHELL_CUSTOM_EDITOR_THEME_ID, buildVsDarkShellMonacoTheme(hex));
  if (applyNow) {
    applyThemeToAllEditors(m, SHELL_CUSTOM_EDITOR_THEME_ID);
  }
}

/**
 * Single path for editor canvas background: update custom bg storage, re-define
 * `shell-custom`, and apply Monaco theme (defaults to shell-custom).
 */
export async function applyShellEditorBackground(
  backgroundHex: string,
  themeId: string = SHELL_CUSTOM_EDITOR_THEME_ID,
): Promise<void> {
  const hex = writeShellCustomEditorBg(backgroundHex);
  try {
    const m = await import("monaco-editor");
    registerShellMatchedMonacoThemes(m);
    m.editor.defineTheme(SHELL_CUSTOM_EDITOR_THEME_ID, buildVsDarkShellMonacoTheme(hex));
    applyThemeToAllEditors(m, themeId === SHELL_CUSTOM_EDITOR_THEME_ID ? SHELL_CUSTOM_EDITOR_THEME_ID : themeId);
    try {
      window.dispatchEvent(new Event("synapseOriginal:editor-theme-changed"));
    } catch {
      /* non-browser */
    }
  } catch {
    /* monaco not loaded yet */
  }
}

export function isShellMatchedEditorThemeId(id: string): boolean {
  return (
    SHELL_MATCHED_EDITOR_THEME_IDS.includes(id as ShellMatchedEditorThemeId) ||
    id.startsWith("shell-")
  );
}

export function shellMatchedEditorThemeOptions(): { id: string; label: string }[] {
  return SHELL_MATCHED_EDITOR_THEME_IDS.map((id) => ({
    id,
    label: SHELL_EDITOR_THEME_LABELS[id] ?? id,
  }));
}
