/** Legacy persisted values from when the 2017 shell was named "cosmic". */

export const LEGACY_UI_MODE_COSMIC = "cosmic";

export const LEGACY_STORAGE_KEYS = {
  shellTheme: "cosmic.shellTheme",
  shellThemeUi: "cosmic.shellThemeUi.v1",
  editorTheme: "cosmic.editorTheme",
  scriptHubHandoff: "cosmic.editorScriptHubHandoff",
} as const;

export const LEGACY_IDB_DB_NAME = "cosmic-shell-media";

export const LEGACY_IDB_KEYS = {
  videoMain: "backgroundVideoCosmic",
  imageMain: "backgroundImageCosmic",
  videoInit: "initBackgroundVideoCosmic",
  imageInit: "initBackgroundImageCosmic",
} as const;

export function migrateUiModeFromLegacy(raw: unknown): unknown {
  return raw === LEGACY_UI_MODE_COSMIC ? "synapseOriginal" : raw;
}
