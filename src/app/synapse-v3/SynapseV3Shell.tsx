import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  ExecutorBridgeProvider,
  useExecutorBridge,
} from "@/app/executorBridge/ExecutorBridgeContext";
import { EditorWorkspaceProvider } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { APP_SETTINGS_CHANGED_EVENT, readAppSettings } from "@/app/appSettings";
import { isTauriApp } from "@/app/tauriEnv";
import {
  closeAllSynapseOriginalSubWindows,
  SYNAPSE_ORIGINAL_SIZES,
  isMainWindow,
  restoreDefaultMainWindow,
  setMainWindowSize,
} from "@/app/synapse-original/windowOps";
import { closeAllSynapseXSubWindows, SYNAPSE_X_SIZES } from "@/app/synapse-x/windowOps";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "@/ui/shellChromeGeometry";
import { applyShellWindowMinSize } from "@/app/windowConstraints";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";
import {
  readV3Theme,
  readV3ThemeUiLiveEdit,
  useV3Theme,
  V3_LIVE_EDIT_CHANGED_EVENT,
  V3_THEME_CHANGED_EVENT,
  writeV3ThemeUiLiveEdit,
} from "./v3Theme";
import { applyV3ThemeToDocument } from "./v3ThemeCss";
import {
  applyShellEditorBackground,
  SHELL_CUSTOM_EDITOR_THEME_ID,
  writeStoredEditorThemeId,
} from "@/editor/editorThemes";
import { scheduleLaunchAlwaysOnTopRefresh, syncCurrentWindowAlwaysOnTop } from "@/app/synapse-original/lib/alwaysOnTop";
import { V3LiveEditProvider } from "./V3LiveEditContext";
import { EditorAiProposalProvider } from "./EditorAiProposalContext";
import { runAutoexecuteScripts } from "./v3AutoExecuteRunner";

function V3AutoAttach() {
  const bridge = useExecutorBridge();
  useEffect(() => {
    bridge.markAttachClicked();
    bridge.armAfterAttachAnimation();
  }, [bridge]);
  return null;
}

function V3AutoExecuteOnConnect() {
  const bridge = useExecutorBridge();
  const prevAttached = useRef(false);

  useEffect(() => {
    if (bridge.attached && !prevAttached.current) {
      void runAutoexecuteScripts(bridge.execute);
    }
    prevAttached.current = bridge.attached;
  }, [bridge.attached, bridge.execute]);

  return null;
}

function V3ThemeSync() {
  const theme = useV3Theme();

  useEffect(() => {
    applyV3ThemeToDocument(theme);
    writeStoredEditorThemeId(theme.editor.monacoThemeId);
    if (theme.editor.monacoThemeId === SHELL_CUSTOM_EDITOR_THEME_ID) {
      void applyShellEditorBackground(theme.editor.workAreaBg, SHELL_CUSTOM_EDITOR_THEME_ID);
    }
  }, [theme]);

  useEffect(() => {
    const sync = () => applyV3ThemeToDocument(readV3Theme());
    window.addEventListener(V3_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    applyV3ThemeToDocument(readV3Theme());
    return () => {
      window.removeEventListener(V3_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return null;
}

export default function SynapseV3Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveEditEnabled, setLiveEditEnabled] = useState(readV3ThemeUiLiveEdit);

  useEffect(() => {
    void syncCurrentWindowAlwaysOnTop();
    scheduleLaunchAlwaysOnTopRefresh();
  }, []);

  useEffect(() => {
    const sync = () => setLiveEditEnabled(readV3ThemeUiLiveEdit());
    window.addEventListener(V3_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(V3_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  /** When uiMode leaves V3, resize the host window to the target shell (Blue / OG / X). */
  useEffect(() => {
    const onModeChange = () => {
      const mode = readAppSettings().uiMode;
      if (mode === "synapseV3") return;
      if (!isMainWindow() || !isTauriApp()) return;

      void closeAllSynapseOriginalSubWindows();
      void closeAllSynapseXSubWindows();

      if (mode === "default") {
        if (location.pathname.startsWith("/synapse-v3")) {
          navigate("/", { replace: true });
        }
        void (async () => {
          await restoreDefaultMainWindow(SHELL_CHROME_WIDTH, SHELL_CHROME_HEIGHT);
          await applyShellWindowMinSize(readAppSettings().resizableWindow);
          try {
            await centerWindowOnCurrentMonitor();
          } catch {
            /* ignore */
          }
        })();
        return;
      }

      if (mode === "synapseOriginal") {
        if (location.pathname.startsWith("/synapse-v3")) {
          navigate("/synapse-original/main", { replace: true });
        }
        void (async () => {
          const { width, height } = SYNAPSE_ORIGINAL_SIZES.main;
          await setMainWindowSize(width, height);
          await applyShellWindowMinSize(readAppSettings().resizableWindow);
          try {
            await centerWindowOnCurrentMonitor();
          } catch {
            /* ignore */
          }
        })();
        return;
      }

      if (mode === "synapseX") {
        if (location.pathname.startsWith("/synapse-v3")) {
          navigate("/synapse-x/main", { replace: true });
        }
        void (async () => {
          const { width, height } = SYNAPSE_X_SIZES.main;
          await setMainWindowSize(width, height);
          await applyShellWindowMinSize(readAppSettings().resizableWindow);
          try {
            await centerWindowOnCurrentMonitor();
          } catch {
            /* ignore */
          }
        })();
      }
    };

    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onModeChange);
    window.addEventListener("storage", onModeChange);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onModeChange);
      window.removeEventListener("storage", onModeChange);
    };
  }, [location.pathname, navigate]);

  return (
    <ExecutorBridgeProvider>
      <V3AutoAttach />
      <V3AutoExecuteOnConnect />
      <V3ThemeSync />
      <EditorWorkspaceProvider>
        <EditorAiProposalProvider>
        <V3LiveEditProvider
          enabled={liveEditEnabled}
          onEnabledChange={(on) => {
            setLiveEditEnabled(on);
            writeV3ThemeUiLiveEdit(on);
          }}
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden font-['Inter',sans-serif] antialiased"
            style={{
              color: "var(--v3-topbar-text, #ffffff)",
              background: "var(--v3-shell-window-bg, #212120)",
              borderRadius: "var(--v3-shell-corner-radius, 7px)",
            }}
          >
            <Outlet />
          </div>
        </V3LiveEditProvider>
        </EditorAiProposalProvider>
      </EditorWorkspaceProvider>
    </ExecutorBridgeProvider>
  );
}
