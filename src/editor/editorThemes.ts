import { PACK_THEME_ENTRIES, registerPackMonacoThemes } from "./monacoThemePack";
import {
  registerShellMatchedMonacoThemes,
  shellMatchedEditorThemeOptions,
  applyShellEditorBackground,
  readShellCustomEditorBg,
  SHELL_CUSTOM_EDITOR_THEME_ID,
  SHELL_EDITOR_THEME_LABELS,
} from "./shellMatchedEditorThemes";
import {
  DEFAULT_EDITOR_THEME_ID,
  isAllowedEditorThemeId,
} from "./editorThemeAllowlist";
import { readShellTheme, writeShellTheme } from "../ui/shellTheme";
import { readAppSettings } from "../app/appSettings";

export const EDITOR_THEME_STORAGE_KEY = "synapseOriginal.editorTheme";

/** Dispatched on `window` when Settings changes theme (same-tab). */
export const EDITOR_THEME_CHANGED_EVENT = "synapseOriginal:editor-theme-changed";

export { DEFAULT_EDITOR_THEME_ID } from "./editorThemeAllowlist";

export type EditorThemeOption = {
  id: string;
  label: string;
};

/** Built-in Monaco themes (no `defineTheme`). */
const BUILTIN_EDITOR_THEMES: EditorThemeOption[] = [
  { id: "vs-dark", label: "VS Dark" },
  { id: "vs", label: "VS Light" },
  { id: "hc-black", label: "High Contrast Dark" },
  { id: "hc-light", label: "High Contrast Light" },
];

function buildEditorThemeOptions(): EditorThemeOption[] {
  const packSorted = [...PACK_THEME_ENTRIES].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
  const defaultEntry = packSorted.find((e) => e.id === DEFAULT_EDITOR_THEME_ID);
  const packRest = packSorted.filter((e) => e.id !== DEFAULT_EDITOR_THEME_ID);
  const packOrdered: EditorThemeOption[] = [
    ...(defaultEntry ? [{ id: defaultEntry.id, label: defaultEntry.label }] : []),
    ...packRest.map((e) => ({ id: e.id, label: e.label })),
  ];
  const shellMatched = shellMatchedEditorThemeOptions();
  return [...BUILTIN_EDITOR_THEMES, ...shellMatched, ...packOrdered];
}

/** All themes: built-ins first, then pack (default Synapse-style theme first, rest A–Z). */
export const EDITOR_THEME_OPTIONS: EditorThemeOption[] = buildEditorThemeOptions();

let customThemesRegistered = false;

export function registerCustomMonacoThemes(m: typeof import("monaco-editor")): void {
  if (customThemesRegistered) return;
  customThemesRegistered = true;
  registerPackMonacoThemes(m);
  registerShellMatchedMonacoThemes(m);
}

export {
  SHELL_CUSTOM_EDITOR_THEME_ID,
  shellMatchedThemeIdForPreset,
  updateShellCustomEditorTheme,
  applyShellEditorBackground,
  syncCustomBgFromPreset,
  shellEditorBgMatchesPreset,
  presetIdForShellEditorBg,
  readShellCustomEditorBg,
  writeShellCustomEditorBg,
  darkenForEditorBg,
  shellMatchedEditorThemeOptions,
} from "./shellMatchedEditorThemes";

export function readStoredEditorThemeId(): string {
  const settings = readAppSettings();
  const theme = readShellTheme();
  const fromShell =
    settings.uiMode === "synapseOriginal"
      ? theme.editorMonacoThemeIdSynapseOriginal
      : settings.uiMode === "synapseX"
        ? theme.editorMonacoThemeIdSynapseX
        : settings.uiMode === "synapseV3"
          ? theme.editorMonacoThemeIdV3
          : theme.editorMonacoThemeId;

  if (isAllowedEditorThemeId(fromShell)) return fromShell;
  try {
    const v =
      localStorage.getItem(EDITOR_THEME_STORAGE_KEY) ??
      localStorage.getItem("cosmic.editorTheme");
    if (v && isAllowedEditorThemeId(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_EDITOR_THEME_ID;
}

export type EditorMonacoThemeShellField =
  | "editorMonacoThemeId"
  | "editorMonacoThemeIdSynapseOriginal"
  | "editorMonacoThemeIdSynapseX"
  | "editorMonacoThemeIdV3";

function uiModeToEditorMonacoField(uiMode: string): EditorMonacoThemeShellField {
  if (uiMode === "synapseOriginal") return "editorMonacoThemeIdSynapseOriginal";
  if (uiMode === "synapseX") return "editorMonacoThemeIdSynapseX";
  if (uiMode === "synapseV3") return "editorMonacoThemeIdV3";
  return "editorMonacoThemeId";
}

/** Classic Monaco + pack themes for Blue / X / OG dropdowns (no V3 shell presets). */
export function filterPublicMonacoThemeOptions(currentId?: string): EditorThemeOption[] {
  const classic = EDITOR_THEME_OPTIONS.filter((o) => !o.id.startsWith("shell-"));
  if (currentId === SHELL_CUSTOM_EDITOR_THEME_ID) {
    return [
      {
        id: SHELL_CUSTOM_EDITOR_THEME_ID,
        label: SHELL_EDITOR_THEME_LABELS[SHELL_CUSTOM_EDITOR_THEME_ID] ?? "Custom background",
      },
      ...classic,
    ];
  }
  return classic;
}

/** Persist Monaco theme for a specific UI shell; live-update editors when that shell is active. */
export function writeShellEditorMonacoTheme(field: EditorMonacoThemeShellField, id: string): void {
  if (!isAllowedEditorThemeId(id)) return;
  writeShellTheme({ [field]: id });
  const isActiveShell = uiModeToEditorMonacoField(readAppSettings().uiMode) === field;
  if (isActiveShell) {
    try {
      localStorage.setItem(EDITOR_THEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EDITOR_THEME_CHANGED_EVENT));
    if (id === SHELL_CUSTOM_EDITOR_THEME_ID) {
      void applyShellEditorBackground(readShellCustomEditorBg(), SHELL_CUSTOM_EDITOR_THEME_ID);
    }
  }
}

export function writeStoredEditorThemeId(id: string): void {
  if (!isAllowedEditorThemeId(id)) return;
  try {
    localStorage.setItem(EDITOR_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  const settings = readAppSettings();
  if (settings.uiMode === "synapseOriginal") {
    writeShellTheme({ editorMonacoThemeIdSynapseOriginal: id });
  } else if (settings.uiMode === "synapseX") {
    writeShellTheme({ editorMonacoThemeIdSynapseX: id });
  } else if (settings.uiMode === "synapseV3") {
    writeShellTheme({ editorMonacoThemeIdV3: id });
  } else {
    writeShellTheme({ editorMonacoThemeId: id });
  }
  window.dispatchEvent(new Event(EDITOR_THEME_CHANGED_EVENT));
}

export function applyMonacoTheme(m: typeof import("monaco-editor"), themeId: string): void {
  registerCustomMonacoThemes(m);
  const id = isAllowedEditorThemeId(themeId) ? themeId : DEFAULT_EDITOR_THEME_ID;
  m.editor.setTheme(id);
}
