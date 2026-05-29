import { invoke } from "@tauri-apps/api/core";
import { migrateUiModeFromLegacy } from "./legacySynapseOriginal";
import { isTauriApp } from "./tauriEnv";

const STORAGE_KEY = "synapse.appSettings.v1";
export const APP_SETTINGS_CHANGED_EVENT = "synapse-app-settings-changed";

/** Monaco `minimap.scale` default (VS Code default). */
export const DEFAULT_MINIMAP_SCALE = 1;
export const MINIMAP_SCALE_MIN = 1;
export const MINIMAP_SCALE_MAX = 4;

export function clampMinimapScale(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_MINIMAP_SCALE;
  return Math.min(MINIMAP_SCALE_MAX, Math.max(MINIMAP_SCALE_MIN, Math.round(n)));
}

/** Desktop window / taskbar icon (PNG baked into the app). */
export type WindowIconPresetId = "icon2" | "framework" | "synapse-icon" | "wordmark";

const WINDOW_ICON_PRESET_IDS: ReadonlySet<WindowIconPresetId> = new Set([
  "icon2",
  "framework",
  "synapse-icon",
  "wordmark",
]);

export function isWindowIconPresetId(id: string): id is WindowIconPresetId {
  return WINDOW_ICON_PRESET_IDS.has(id as WindowIconPresetId);
}

export const WINDOW_ICON_PRESET_OPTIONS: ReadonlyArray<{
  id: WindowIconPresetId;
  label: string;
  hint: string;
}> = [
  { id: "icon2", label: "Icon mark (v2)", hint: "Colorful S mark (default)" },
  { id: "framework", label: "Framework wordmark", hint: "SYNAPSE Framework banner" },
  { id: "synapse-icon", label: "Icon mark (legacy)", hint: "Earlier colorful S mark" },
  { id: "wordmark", label: "Wordmark", hint: "Classic Synapse banner (may look soft at small sizes)" },
];

/** Top-level UI mode: Synapse Blue, Synapse 2017 (OG), or Synapse X shell. */
export type UiModeId = "default" | "synapseOriginal" | "synapseX" | "synapseV3";

/**
 * Executor bridge protocol the UI is bound to. `macos` auto-detects MacSploit
 * and Opiumware TCP executors.
 */
export type BridgeMethodId = "macos" | "websocket" | "port" | "macsploit" | "opiumware" | "simulation";

export type AppSettings = {
  autoAttach: boolean;
  clearConfirmation: boolean;
  closeFileConfirmation: boolean;
  resizableWindow: boolean;
  /** Desktop only: keep the window above other windows. */
  alwaysOnTop: boolean;
  /** Desktop only: which built-in asset to use for the native window / taskbar icon. */
  windowIconPreset: WindowIconPresetId;
  /**
   * Website embedded on `/integrated-webpage` (Options → Open in shell). Stored locally; must be http(s).
   * Normalized when saved (e.g. adds https:// if missing).
   */
  altgenPageUrl: string;
  /** Which UI shell to use. `synapseOriginal` = Synapse 2017; `synapseX` = Synapse X shell. */
  uiMode: UiModeId;
  /** Show the code minimap on the right side of the editor. */
  minimapEnabled: boolean;
  /** Monaco minimap font scale (1 = default). */
  minimapScale: number;
  /** Experimental editor error logging using luaparse diagnostics. */
  errorLoggingEnabled: boolean;
  /** Whether window edge curve/rounded corners are applied on Windows. */
  edgeCurveDefault?: boolean;
  edgeCurveSynapseOriginal?: boolean;
  edgeCurveSynapseX?: boolean;
  /** Which executor bridge protocol the UI listens to. See `BridgeMethodId`. */
  bridgeMethod: BridgeMethodId;
  /** Synapse Blue: V3-style script list panel in the editor. */
  enhancedScriptListDefault?: boolean;
  /** Synapse 2017 (OG): enhanced script list panel vs compact legacy list. */
  enhancedScriptListSynapseOriginal?: boolean;
  /** Synapse X: enhanced script list panel vs compact legacy list. */
  enhancedScriptListSynapseX?: boolean;
  /** Synapse V3: show/hide the editor script list panel. */
  enhancedScriptListSynapseV3?: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoAttach: false,
  clearConfirmation: true,
  closeFileConfirmation: true,
  resizableWindow: false,
  alwaysOnTop: false,
  windowIconPreset: "icon2",
  altgenPageUrl: "",
  uiMode: "synapseV3",
  minimapEnabled: false,
  minimapScale: DEFAULT_MINIMAP_SCALE,
  errorLoggingEnabled: false,
  bridgeMethod: "macos",
  enhancedScriptListDefault: false,
  enhancedScriptListSynapseOriginal: false,
  enhancedScriptListSynapseX: false,
  enhancedScriptListSynapseV3: true,
};

function mergeWithDefaults(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APP_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    autoAttach: typeof o.autoAttach === "boolean" ? o.autoAttach : DEFAULT_APP_SETTINGS.autoAttach,
    clearConfirmation:
      typeof o.clearConfirmation === "boolean"
        ? o.clearConfirmation
        : DEFAULT_APP_SETTINGS.clearConfirmation,
    closeFileConfirmation:
      typeof o.closeFileConfirmation === "boolean"
        ? o.closeFileConfirmation
        : DEFAULT_APP_SETTINGS.closeFileConfirmation,
    resizableWindow:
      typeof o.resizableWindow === "boolean"
        ? o.resizableWindow
        : DEFAULT_APP_SETTINGS.resizableWindow,
    alwaysOnTop:
      typeof o.alwaysOnTop === "boolean" ? o.alwaysOnTop : DEFAULT_APP_SETTINGS.alwaysOnTop,
    windowIconPreset: (() => {
      const raw = String(o.windowIconPreset ?? "");
      if (raw === "synapse-icon") return "icon2";
      return isWindowIconPresetId(raw)
        ? (raw as WindowIconPresetId)
        : DEFAULT_APP_SETTINGS.windowIconPreset;
    })(),
    altgenPageUrl:
      typeof o.altgenPageUrl === "string"
        ? o.altgenPageUrl.slice(0, 2048)
        : DEFAULT_APP_SETTINGS.altgenPageUrl,
    uiMode: (() => {
      const mode = migrateUiModeFromLegacy(o.uiMode);
      return mode === "synapseOriginal" ||
        mode === "default" ||
        mode === "synapseX" ||
        mode === "synapseV3"
        ? (mode as UiModeId)
        : DEFAULT_APP_SETTINGS.uiMode;
    })(),
    minimapEnabled:
      typeof o.minimapEnabled === "boolean" ? o.minimapEnabled : DEFAULT_APP_SETTINGS.minimapEnabled,
    minimapScale: clampMinimapScale(o.minimapScale),
    errorLoggingEnabled:
      typeof o.errorLoggingEnabled === "boolean" ? o.errorLoggingEnabled : DEFAULT_APP_SETTINGS.errorLoggingEnabled,
    edgeCurveDefault:
      typeof o.edgeCurveDefault === "boolean" ? o.edgeCurveDefault : undefined,
    edgeCurveSynapseOriginal: (() => {
      if (typeof o.edgeCurveSynapseOriginal === "boolean") return o.edgeCurveSynapseOriginal;
      if (typeof o.edgeCurveCosmic === "boolean") return o.edgeCurveCosmic;
      return undefined;
    })(),
    edgeCurveSynapseX:
      typeof o.edgeCurveSynapseX === "boolean" ? o.edgeCurveSynapseX : undefined,
    bridgeMethod: "macos",
    enhancedScriptListDefault: (() => {
      if (typeof o.enhancedScriptListDefault === "boolean") return o.enhancedScriptListDefault;
      if (typeof o.enhancedScriptListEnabled === "boolean") return o.enhancedScriptListEnabled;
      return DEFAULT_APP_SETTINGS.enhancedScriptListDefault;
    })(),
    enhancedScriptListSynapseOriginal: (() => {
      if (typeof o.enhancedScriptListSynapseOriginal === "boolean") return o.enhancedScriptListSynapseOriginal;
      if (typeof o.enhancedScriptListCosmic === "boolean") return o.enhancedScriptListCosmic;
      if (typeof o.enhancedScriptListEnabled === "boolean") return o.enhancedScriptListEnabled;
      return DEFAULT_APP_SETTINGS.enhancedScriptListSynapseOriginal;
    })(),
    enhancedScriptListSynapseX: (() => {
      if (typeof o.enhancedScriptListSynapseX === "boolean") return o.enhancedScriptListSynapseX;
      if (typeof o.enhancedScriptListEnabled === "boolean") return o.enhancedScriptListEnabled;
      return DEFAULT_APP_SETTINGS.enhancedScriptListSynapseX;
    })(),
    enhancedScriptListSynapseV3: (() => {
      if (typeof o.enhancedScriptListSynapseV3 === "boolean") return o.enhancedScriptListSynapseV3;
      if (typeof o.enhancedScriptListEnabled === "boolean") return o.enhancedScriptListEnabled;
      return DEFAULT_APP_SETTINGS.enhancedScriptListSynapseV3;
    })(),
  };
}

/** Whether the enhanced script list panel is enabled for the given UI shell. */
export function isEnhancedScriptListEnabled(
  settings: AppSettings,
  uiMode: UiModeId = settings.uiMode,
): boolean {
  switch (uiMode) {
    case "synapseV3":
      return settings.enhancedScriptListSynapseV3 ?? true;
    case "synapseOriginal":
      return settings.enhancedScriptListSynapseOriginal ?? false;
    case "synapseX":
      return settings.enhancedScriptListSynapseX ?? false;
    default:
      return settings.enhancedScriptListDefault ?? false;
  }
}

export function readAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const merged = mergeWithDefaults(JSON.parse(raw));
    return merged;
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function writeAppSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...readAppSettings(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  if (isTauriApp()) {
    void invoke("persist_app_settings_snapshot", {
      snapshot: JSON.stringify(next),
    }).catch(() => {});
    if (partial.windowIconPreset !== undefined) {
      void invoke("persist_window_icon_preset", { preset: next.windowIconPreset }).catch((err) => {
        if (import.meta.env.DEV) {
          console.warn("persist_window_icon_preset failed:", err);
        }
      });
    }
  }
  window.dispatchEvent(new Event(APP_SETTINGS_CHANGED_EVENT));
  return next;
}

export function shouldApplyEdgeCurve(settings: AppSettings): boolean {
  if (settings.uiMode === "synapseV3") {
    return true; // V3 always has edge curve
  }
  if (settings.uiMode === "synapseOriginal") {
    return settings.edgeCurveSynapseOriginal ?? false;
  }
  if (settings.uiMode === "synapseX") {
    return settings.edgeCurveSynapseX ?? false;
  }
  return settings.edgeCurveDefault ?? false;
}
