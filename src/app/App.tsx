import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { RouterProvider } from "react-router";
import {
  getUiFontStack,
  hexToRgbComponents,
  readShellTheme,
  SHELL_THEME_CHANGED_EVENT,
} from "@/ui/shellTheme";
import { applyUiFontVerticalMetricsToDocument } from "@/ui/uiFontVerticalTuning";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  CONFIRMATION_DIALOG_REQUEST_SHELL_EVENT,
  CONFIRMATION_DIALOG_SHELL_SNAPSHOT_EVENT,
} from "./editorClearDialog";
import { APP_SETTINGS_CHANGED_EVENT, readAppSettings, shouldApplyEdgeCurve } from "./appSettings";
import { readOgTheme } from "./synapse-original/ogTheme";
import { readSynapseXTheme } from "./synapse-x/synapseXTheme";
import { CROSS_WINDOW_STORAGE_KEYS, listenCrossWindowStorage } from "./crossWindowSync";
import { router } from "./routes";
import { isTauriApp } from "./tauriEnv";
import { applyShellWindowMinSize, clampWindowSizeToShellAndMonitor, shouldApplyMainShellMinSize } from "./windowConstraints";
import { scheduleLaunchAlwaysOnTopRefresh, syncCurrentWindowAlwaysOnTop } from "./synapse-original/lib/alwaysOnTop";

const SHELL_TEXT_STEP_VAR = "--shell-text-step-px";
const SHELL_TEXT_STEP_ACTIVE = "data-shell-text-step-active";
/** Unitless 0…max step; scales theme input min-heights with positive text size steps. */
const SHELL_UI_FONT_STEP_POSITIVE = "--shell-ui-font-step-positive";

function resolveShellStageBg(settings: ReturnType<typeof readAppSettings>): string {
  const applyCurve = shouldApplyEdgeCurve(settings);
  if (settings.uiMode === "synapseV3" || applyCurve) return "transparent";
  if (settings.uiMode === "synapseOriginal") return readOgTheme().windowBg;
  if (settings.uiMode === "synapseX") return readSynapseXTheme().windowBg;
  return readShellTheme().shellBg;
}

export default function App() {
  const [chrome, setChrome] = useState(() => {
    const t = readShellTheme();
    return {
      stack: getUiFontStack(t.uiFontId),
      step: t.uiFontSizeStep,
      fontId: t.uiFontId,
    };
  });
  /** Tauri webview stage: match main shell bg so init morph / MainLayout never sit on hardcoded black. */
  const [shellStageBg, setShellStageBg] = useState(() => resolveShellStageBg(readAppSettings()));

  const syncChrome = useCallback(() => {
    const t = readShellTheme();
    setChrome({
      stack: getUiFontStack(t.uiFontId),
      step: t.uiFontSizeStep,
      fontId: t.uiFontId,
    });
    const settings = readAppSettings();
    setShellStageBg(resolveShellStageBg(settings));
  }, []);

  useEffect(() => {
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, syncChrome);
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, syncChrome);
    const offStorage = listenCrossWindowStorage(
      [
        CROSS_WINDOW_STORAGE_KEYS.appSettings,
        CROSS_WINDOW_STORAGE_KEYS.shellTheme,
        CROSS_WINDOW_STORAGE_KEYS.sxTheme,
        CROSS_WINDOW_STORAGE_KEYS.ogTheme,
      ],
      syncChrome,
    );
    return () => {
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, syncChrome);
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, syncChrome);
      offStorage();
    };
  }, [syncChrome]);

  useLayoutEffect(() => {
    const el = document.documentElement;
    el.style.setProperty(SHELL_UI_FONT_STEP_POSITIVE, String(Math.max(0, chrome.step)));
    if (chrome.step === 0) {
      el.removeAttribute(SHELL_TEXT_STEP_ACTIVE);
      el.style.removeProperty(SHELL_TEXT_STEP_VAR);
    } else {
      el.setAttribute(SHELL_TEXT_STEP_ACTIVE, "");
      el.style.setProperty(SHELL_TEXT_STEP_VAR, `${chrome.step}px`);
    }
    return () => {
      el.removeAttribute(SHELL_TEXT_STEP_ACTIVE);
      el.style.removeProperty(SHELL_TEXT_STEP_VAR);
    };
  }, [chrome.step]);

  useLayoutEffect(() => {
    applyUiFontVerticalMetricsToDocument(chrome.fontId);
  }, [chrome.fontId]);

  /** Mirror persisted always-on-top on cold start and when settings change (all shells). */
  useLayoutEffect(() => {
    if (!isTauriApp()) return;
    void syncCurrentWindowAlwaysOnTop();
    scheduleLaunchAlwaysOnTopRefresh();
    const onSettings = () => {
      void syncCurrentWindowAlwaysOnTop();
    };
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
    window.addEventListener("storage", onSettings);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
      window.removeEventListener("storage", onSettings);
    };
  }, []);

  /** Disable native DWM shadow/rounding on undecorated windows to avoid 1px border stroke bugs and forced DWM rounded corners. */
  useEffect(() => {
    if (!isTauriApp()) return;
    const updateShadow = () => {
      void getCurrentWindow().setShadow(false);
    };
    updateShadow();
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, updateShadow);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, updateShadow);
    };
  }, []);

  /** Keep on-disk window icon preset aligned with Options (used on next cold start). */
  useEffect(() => {
    if (!isTauriApp()) return;
    void invoke("persist_window_icon_preset", {
      preset: readAppSettings().windowIconPreset,
    }).catch(() => {});
  }, []);

  /** Match native window / WebView2 backdrop to shell bg to avoid light flashes while resizing. */
  useEffect(() => {
    if (!isTauriApp()) return;
    if (shellStageBg === "transparent") {
      void getCurrentWindow().setBackgroundColor([0, 0, 0, 0]);
      return;
    }
    const { r, g, b } = hexToRgbComponents(shellStageBg);
    void getCurrentWindow().setBackgroundColor([r, g, b, 255]);
  }, [shellStageBg]);

  /** Enforce shell minimum size when resizable; clamp oversized resizes to the current monitor
   * work area. Re-applies on `APP_SETTINGS_CHANGED_EVENT` / `storage` so toggling `uiMode` or
   * `resizableWindow` mid-session updates the bound to the active shell's main dimensions. */
  useEffect(() => {
    if (!isTauriApp()) return;
    let unlisten: (() => void) | undefined;
    const reapplyMinSize = () => {
      const settingsResizable = readAppSettings().resizableWindow;
      // Loaders own their own min-size (null) - skip while one is on screen.
      void applyShellWindowMinSize(settingsResizable && shouldApplyMainShellMinSize());
    };
    void (async () => {
      // NOTE: no eager reapplyMinSize() here - main pages call applyShellWindowMinSize on mount.
      unlisten = await getCurrentWindow().onResized(({ payload }) => {
        if (!readAppSettings().resizableWindow) return;
        if (!shouldApplyMainShellMinSize()) return;
        void clampWindowSizeToShellAndMonitor(true, payload);
      });
    })();
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, reapplyMinSize);
    window.addEventListener("storage", reapplyMinSize);
    return () => {
      try {
        unlisten?.();
      } catch {
        /* ignore */
      }
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, reapplyMinSize);
      window.removeEventListener("storage", reapplyMinSize);
    };
  }, []);

  /** Confirmation webviews may not share localStorage — respond with live logo fields from the main window. */
  useEffect(() => {
    if (!isTauriApp()) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen(CONFIRMATION_DIALOG_REQUEST_SHELL_EVENT, () => {
        if (getCurrentWindow().label !== "main") return;
        const s = readShellTheme();
        void emit(CONFIRMATION_DIALOG_SHELL_SNAPSHOT_EVENT, {
          logoDataUrl: s.logoDataUrl,
          topBarLogoPreset: s.topBarLogoPreset,
        });
      });
    })();
    return () => {
      try {
        unlisten?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const tauri = isTauriApp();
  return (
    <div
      className={
        tauri
          ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden font-normal"
          : "min-h-dvh w-full flex items-center justify-center bg-black font-normal"
      }
      style={{
        fontFamily: chrome.stack,
        ...(tauri ? { backgroundColor: shellStageBg } : {}),
      }}
    >
      <RouterProvider router={router} />
    </div>
  );
}
