import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { ExecutorBridgeProvider } from "@/app/executorBridge/ExecutorBridgeContext";
import { EditorWorkspaceProvider } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { APP_SETTINGS_CHANGED_EVENT, readAppSettings, shouldApplyEdgeCurve } from "@/app/appSettings";
import { isTauriApp } from "@/app/tauriEnv";
import {
  closeAllSynapseOriginalSubWindows,
  SYNAPSE_ORIGINAL_SIZES,
  isSynapseOriginalSubWindow,
  isMainWindow,
  restoreDefaultMainWindow,
  setMainWindowSize,
} from "@/app/synapse-original/windowOps";
import {
  closeAllSynapseXSubWindows,
  isSynapseXSubWindow,
} from "@/app/synapse-x/windowOps";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "@/ui/shellChromeGeometry";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";
import { scheduleLaunchAlwaysOnTopRefresh, syncCurrentWindowAlwaysOnTop } from "@/app/synapse-original/lib/alwaysOnTop";
import { readSynapseXTheme, SYNAPSE_X_THEME_CHANGED_EVENT } from "@/app/synapse-x/synapseXTheme";
import {
  readSynapseXThemeUiLiveEdit,
  writeSynapseXThemeUiLiveEdit,
  SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT,
} from "@/app/synapse-x/synapseXThemeUi";
import { SynapseXLiveEditProvider } from "@/app/synapse-x/SynapseXLiveEditContext";
import { CROSS_WINDOW_STORAGE_KEYS, listenCrossWindowStorage } from "@/app/crossWindowSync";
import { SYNAPSE_V3_MAIN_SIZE } from "@/app/synapse-v3/v3WindowOps";

/**
 * Wraps `/synapse-x/*` — same executor + editor workspace as Synapse Original so Monaco matches default shell behavior.
 */
export default function SynapseXShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void syncCurrentWindowAlwaysOnTop();
    scheduleLaunchAlwaysOnTopRefresh();
  }, []);

  /**
   * Mirror the Synapse X theme into CSS variables on `:root` so every Synapse X surface can use
   * `var(--sx-window-bg)` / `var(--sx-panel-bg)` / `var(--sx-text)`. Stays in sync with cross-window
   * storage events.
   */
  useEffect(() => {
    const apply = () => {
      const t = readSynapseXTheme();
      const root = document.documentElement;
      root.style.setProperty("--sx-window-bg", t.windowBg);
      root.style.setProperty("--sx-panel-bg", t.panelBg);
      root.style.setProperty("--sx-text", t.text);
      root.style.setProperty("--sx-overlay-opacity", String(t.overlayOpacity));
      root.style.setProperty("--sx-button-bg", t.buttonBg);
      root.style.setProperty("--sx-button-hover-bg", t.buttonHoverBg);
      root.style.setProperty("--sx-button-active-bg", t.buttonActiveBg);
      root.style.setProperty("--sx-button-border", t.buttonBorder);
      root.style.setProperty("--sx-button-text", t.buttonText);
      root.style.setProperty("--sx-tab-bg", t.tabBg);
      root.style.setProperty("--sx-tab-active-bg", t.tabActiveBg);
      root.style.setProperty("--sx-tab-border", t.tabBorder);
      root.style.setProperty("--sx-tab-active-border", t.tabActiveBorder);
      root.style.setProperty("--sx-tab-text", t.tabText);
      root.style.setProperty("--sx-editor-bg", t.editorBg);
      root.style.setProperty("--sx-list-hover-bg", t.listHoverBg);
      root.style.setProperty("--sx-list-text", t.listText);
      root.style.setProperty("--sx-icon-color", t.iconColor);
      const sl = t.scriptList;
      root.style.setProperty("--sx-script-section-bg", sl.sectionHeaderBg);
      root.style.setProperty("--sx-script-section-text", sl.sectionHeaderText);
      root.style.setProperty("--sx-script-section-icon", sl.sectionIcon);
      root.style.setProperty("--sx-script-search-bg", sl.searchBg);
      root.style.setProperty("--sx-script-search-placeholder", sl.searchPlaceholder);
      root.style.setProperty("--sx-script-row-text", sl.rowText);
      root.style.setProperty("--sx-script-row-hover", sl.rowHoverBg);
      root.style.setProperty("--sx-script-row-muted", sl.rowMutedText);
    };
    apply();
    window.addEventListener(SYNAPSE_X_THEME_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(SYNAPSE_X_THEME_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  useEffect(() => {
    const onModeChange = () => {
      const mode = readAppSettings().uiMode;
      if (mode === "synapseX") return;

      if (isSynapseOriginalSubWindow() || isSynapseXSubWindow()) {
        if (!isTauriApp()) return;
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
        void closeAllSynapseXSubWindows();

        if (mode === "default") {
          if (location.pathname.startsWith("/synapse-x")) {
            navigate("/", { replace: true });
          }
          void restoreDefaultMainWindow(SHELL_CHROME_WIDTH, SHELL_CHROME_HEIGHT);
          return;
        }

        if (mode === "synapseOriginal") {
          if (location.pathname.startsWith("/synapse-x")) {
            navigate("/synapse-original/main", { replace: true });
          }
          void (async () => {
            const { width, height } = SYNAPSE_ORIGINAL_SIZES.main;
            await setMainWindowSize(width, height);
            try {
              await centerWindowOnCurrentMonitor();
            } catch {
              /* ignore */
            }
          })();
        } else if (mode === "synapseV3") {
          if (location.pathname.startsWith("/synapse-x")) {
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

  const [liveEditEnabled, setLiveEditEnabled] = useState(readSynapseXThemeUiLiveEdit);

  useEffect(() => {
    const sync = () => setLiveEditEnabled(readSynapseXThemeUiLiveEdit());
    window.addEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
    const offStorage = listenCrossWindowStorage([CROSS_WINDOW_STORAGE_KEYS.sxLiveEditUi], sync);
    return () => {
      window.removeEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
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
  const outerBg = applyCurve ? "transparent" : "var(--sx-window-bg, #333333)";

  return (
    <ExecutorBridgeProvider>
      <EditorWorkspaceProvider>
        <SynapseXLiveEditProvider
          enabled={liveEditEnabled}
          onEnabledChange={(on) => {
            setLiveEditEnabled(on);
            writeSynapseXThemeUiLiveEdit(on);
          }}
        >
        <div className="h-full w-full" style={{ backgroundColor: outerBg }}>
          <div
            className={`h-full w-full overflow-hidden ${
              applyCurve ? "border border-[#414342] border-solid" : "border-none"
            }`}
            style={{
              backgroundColor: "var(--sx-window-bg, #333333)",
              borderRadius: applyCurve ? 7 : 0,
            }}
            data-sx-live-fallback="windowBg"
          >
            <Outlet />
          </div>
        </div>
        </SynapseXLiveEditProvider>
      </EditorWorkspaceProvider>
    </ExecutorBridgeProvider>
  );
}
