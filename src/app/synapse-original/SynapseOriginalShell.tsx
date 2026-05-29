import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { ExecutorBridgeProvider } from "@/app/executorBridge/ExecutorBridgeContext";
import { EditorWorkspaceProvider } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { APP_SETTINGS_CHANGED_EVENT, readAppSettings, shouldApplyEdgeCurve } from "@/app/appSettings";
import { isTauriApp } from "@/app/tauriEnv";
import {
  closeAllSynapseOriginalSubWindows,
  isSynapseOriginalSubWindow,
  isMainWindow,
  restoreDefaultMainWindow,
  setMainWindowSize,
} from "./windowOps";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "@/ui/shellChromeGeometry";
import { scheduleLaunchAlwaysOnTopRefresh, syncCurrentWindowAlwaysOnTop } from "./lib/alwaysOnTop";
import { OG_THEME_CHANGED_EVENT, readOgTheme } from "./ogTheme";
import {
  readOgThemeUiLiveEdit,
  writeOgThemeUiLiveEdit,
  OG_LIVE_EDIT_CHANGED_EVENT,
} from "./ogThemeUi";
import { OgLiveEditProvider } from "./OgLiveEditContext";
import { CROSS_WINDOW_STORAGE_KEYS, listenCrossWindowStorage } from "@/app/crossWindowSync";
import { closeAllSynapseXSubWindows, SYNAPSE_X_SIZES } from "@/app/synapse-x/windowOps";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";
import { SYNAPSE_V3_MAIN_SIZE } from "@/app/synapse-v3/v3WindowOps";

/**
 * SynapseOriginalShell wraps every `/synapse-original/*` route. Provides the bridge + editor workspace contexts
 * so synapse-original main/sub-windows can use `useExecutorBridge()` and `useEditorWorkspace()`. Also:
 * - Listens to `uiMode` setting changes; if user flips back to default, the **main** window
 *   morphs back to default routes/size and **sub-windows** close themselves.
 * - Mirrors persisted `alwaysOnTop` to this webview on mount.
 */
export default function SynapseOriginalShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void syncCurrentWindowAlwaysOnTop();
    scheduleLaunchAlwaysOnTopRefresh();
  }, []);

  /**
   * Mirror the OG theme into CSS variables on `:root` so every OG page can use
   * `var(--og-window-bg)` / `var(--og-panel-bg)` / `var(--og-text)`. Also exposes the
   * overlay opacity as `--og-overlay-opacity` (the overlay image itself only renders on
   * the main OG window). Stays in sync with cross-window storage events.
   */
  useEffect(() => {
    const apply = () => {
      const t = readOgTheme();
      const root = document.documentElement;
      root.style.setProperty("--og-window-bg", t.windowBg);
      root.style.setProperty("--og-panel-bg", t.panelBg);
      root.style.setProperty("--og-text", t.text);
      root.style.setProperty("--og-overlay-opacity", String(t.overlayOpacity));
      root.style.setProperty("--og-button-bg", t.buttonBg);
      root.style.setProperty("--og-button-hover-bg", t.buttonHoverBg);
      root.style.setProperty("--og-button-active-bg", t.buttonActiveBg);
      root.style.setProperty("--og-button-border", t.buttonBorder);
      root.style.setProperty("--og-button-text", t.buttonText);
      root.style.setProperty("--og-tab-bg", t.tabBg);
      root.style.setProperty("--og-tab-active-bg", t.tabActiveBg);
      root.style.setProperty("--og-tab-border", t.tabBorder);
      root.style.setProperty("--og-tab-active-border", t.tabActiveBorder);
      root.style.setProperty("--og-tab-text", t.tabText);
      root.style.setProperty("--og-editor-bg", t.editorBg);
      root.style.setProperty("--og-list-hover-bg", t.listHoverBg);
      root.style.setProperty("--og-list-text", t.listText);
      root.style.setProperty("--og-icon-color", t.iconColor);
      const sl = t.scriptList;
      root.style.setProperty("--og-script-section-bg", sl.sectionHeaderBg);
      root.style.setProperty("--og-script-section-text", sl.sectionHeaderText);
      root.style.setProperty("--og-script-section-icon", sl.sectionIcon);
      root.style.setProperty("--og-script-search-bg", sl.searchBg);
      root.style.setProperty("--og-script-search-placeholder", sl.searchPlaceholder);
      root.style.setProperty("--og-script-row-text", sl.rowText);
      root.style.setProperty("--og-script-row-hover", sl.rowHoverBg);
      root.style.setProperty("--og-script-row-muted", sl.rowMutedText);
    };
    apply();
    window.addEventListener(OG_THEME_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(OG_THEME_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  useEffect(() => {
    const onModeChange = () => {
      const mode = readAppSettings().uiMode;
      if (mode === "synapseOriginal") return;
      // user flipped to default
      if (isSynapseOriginalSubWindow()) {
        if (!isTauriApp()) return;
        // Sub-window: close ourselves (main will morph back independently).
        void (async () => {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          try {
            await getCurrentWindow().close();
          } catch {
            /* ignore */
          }
        })();
        return;
      }
      if (isMainWindow() || !isTauriApp()) {
        void closeAllSynapseOriginalSubWindows();
        if (mode === "default") {
          if (location.pathname.startsWith("/synapse-original")) {
            navigate("/", { replace: true });
          }
          void restoreDefaultMainWindow(SHELL_CHROME_WIDTH, SHELL_CHROME_HEIGHT);
        } else if (mode === "synapseX") {
          void closeAllSynapseXSubWindows();
          if (location.pathname.startsWith("/synapse-original")) {
            navigate("/synapse-x/main", { replace: true });
          }
          void (async () => {
            const { width, height } = SYNAPSE_X_SIZES.main;
            await setMainWindowSize(width, height);
            try {
              await centerWindowOnCurrentMonitor();
            } catch {
              /* ignore */
            }
          })();
        } else if (mode === "synapseV3") {
          if (location.pathname.startsWith("/synapse-original")) {
            navigate("/synapse-v3/main", { replace: true });
          }
          void (async () => {
            await setMainWindowSize(SYNAPSE_V3_MAIN_SIZE.width, SYNAPSE_V3_MAIN_SIZE.height);
            try {
              await centerWindowOnCurrentMonitor();
            } catch {
              /* ignore */
            }
          })();
        }
      }
    };

    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onModeChange);
    window.addEventListener("storage", onModeChange);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onModeChange);
      window.removeEventListener("storage", onModeChange);
    };
  }, [location.pathname, navigate]);

  const [liveEditEnabled, setLiveEditEnabled] = useState(readOgThemeUiLiveEdit);

  useEffect(() => {
    const sync = () => setLiveEditEnabled(readOgThemeUiLiveEdit());
    window.addEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
    const offStorage = listenCrossWindowStorage([CROSS_WINDOW_STORAGE_KEYS.ogLiveEditUi], sync);
    return () => {
      window.removeEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
      offStorage();
    };
  }, []);

  const [settings, setSettings] = useState(readAppSettings);
  useEffect(() => {
    const onSettings = () => setSettings(readAppSettings());
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
    const offStorage = listenCrossWindowStorage([CROSS_WINDOW_STORAGE_KEYS.appSettings], onSettings);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
      offStorage();
    };
  }, []);

  const applyCurve = shouldApplyEdgeCurve(settings);
  const outerBg = applyCurve ? "transparent" : "var(--og-window-bg, #1a1a1a)";

  return (
    <ExecutorBridgeProvider>
      <EditorWorkspaceProvider>
        <OgLiveEditProvider
          enabled={liveEditEnabled}
          onEnabledChange={(on) => {
            setLiveEditEnabled(on);
            writeOgThemeUiLiveEdit(on);
          }}
        >
        <div className="h-full w-full" style={{ backgroundColor: outerBg }}>
          <div
            className={`h-full w-full overflow-hidden ${
              applyCurve ? "border border-[#414342] border-solid" : "border-none"
            }`}
            style={{
              backgroundColor: "var(--og-window-bg, #1a1a1a)",
              borderRadius: applyCurve ? 7 : 0,
            }}
            data-og-live-fallback="windowBg"
          >
            <Outlet />
          </div>
        </div>
        </OgLiveEditProvider>
      </EditorWorkspaceProvider>
    </ExecutorBridgeProvider>
  );
}
