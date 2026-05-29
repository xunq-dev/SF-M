import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { readAppSettings } from "@/app/appSettings";
import { applyShellWindowMinSize } from "@/app/windowConstraints";
import { V3LoadingScreen } from "../components/V3LoadingScreen";
import { V3EditorPage } from "../components/V3EditorPage";
import { V3SettingsPage } from "../components/V3SettingsPage";
import { V3ThemePage } from "../components/V3ThemePage";
import { V3ScriptHubPage } from "../components/V3ScriptHubPage";
import { V3PluginsPage } from "../components/V3PluginsPage";
import { V3PageBackgroundLayer } from "../components/V3PageBackgroundLayer";
import type { V3Page } from "../v3PageTypes";
import { SYNAPSE_V3_MAIN_SIZE } from "../v3WindowOps";

type Page = V3Page;

export default function SynapseV3MainPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("editor");
  const [windowSize, setWindowSize] = useState({
    w: SYNAPSE_V3_MAIN_SIZE.width,
    h: SYNAPSE_V3_MAIN_SIZE.height,
  });
  const settings = readAppSettings();
  const prevResizableRef = useRef(settings.resizableWindow);

  // earlyv3 standard size: 961x461
  useEffect(() => {
    void (async () => {
      try {
        await getCurrentWindow().setSize(
          new LogicalSize(SYNAPSE_V3_MAIN_SIZE.width, SYNAPSE_V3_MAIN_SIZE.height),
        );
      } catch { /* ignore */ }
    })();

    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Mirror the resizable behavior from other shells
  useEffect(() => {
    void (async () => {
      try {
        const win = getCurrentWindow();
        const prev = prevResizableRef.current;
        prevResizableRef.current = settings.resizableWindow;

        await win.setResizable(settings.resizableWindow);
        if (settings.resizableWindow) {
          // ensure minimum size is applied before un-maximizing, otherwise window collapses
          await applyShellWindowMinSize(settings.resizableWindow);
        }

        const justDisabled = prev === true && settings.resizableWindow === false;
        if (justDisabled && (await win.isMaximized())) {
          await win.unmaximize();
        }

        if (!settings.resizableWindow) {
          await win.setSize(
            new LogicalSize(SYNAPSE_V3_MAIN_SIZE.width, SYNAPSE_V3_MAIN_SIZE.height),
          );
          await applyShellWindowMinSize(settings.resizableWindow);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [settings.resizableWindow]);

  // Track window size for responsive scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute responsive values (we removed strict scaling)
  const isSettings = currentPage === "settings";
  const isTheme = currentPage === "theme";

  const renderPage = () => {
    switch (currentPage) {
      case "settings":
        return <V3SettingsPage currentPage={currentPage} onNavigate={setCurrentPage} />;
      case "theme":
        return <V3ThemePage currentPage={currentPage} onNavigate={setCurrentPage} />;
      case "scriptHub":
        return <V3ScriptHubPage currentPage={currentPage} onNavigate={setCurrentPage} />;
      case "plugins":
        return <V3PluginsPage currentPage={currentPage} onNavigate={setCurrentPage} />;
      default:
        return <V3EditorPage currentPage={currentPage} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div
      className="size-full flex items-center justify-center overflow-hidden"
    >
      <div 
        className="relative overflow-hidden border-solid w-full h-full"
        data-v3-live-fallback="shell.windowBg"
        style={{
          borderRadius: "var(--v3-shell-corner-radius, 7px)",
          background: "var(--v3-shell-window-bg, #212120)",
          borderWidth: "0.7px",
          borderColor: "var(--v3-shell-border, #2b2d2c)",
          boxShadow: "var(--v3-shell-edge-shadow)",
        }}
      >
        <div className="absolute inset-0">
          <V3PageBackgroundLayer />
          <div className="relative z-[3] size-full">{renderPage()}</div>
        </div>

        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 z-50"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <V3LoadingScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
