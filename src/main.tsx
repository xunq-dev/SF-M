import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { hexToRgbComponents, readShellTheme } from "./ui/shellTheme";
import "./editor/monacoSetup";
import "./styles/index.css";
import App from "./app/App";
import { applyAlternateShellBootPathFromSettings } from "./app/altShellBootPath";
import { readAppSettings } from "./app/appSettings";

if (typeof document !== "undefined" && isTauri()) {
  document.documentElement.classList.add("synapse-tauri");
  if (readAppSettings().uiMode === "synapseV3") {
    void getCurrentWindow().setBackgroundColor([0, 0, 0, 0]);
  } else {
    const { r, g, b } = hexToRgbComponents(readShellTheme().shellBg);
    void getCurrentWindow().setBackgroundColor([r, g, b]);
  }
}

/**
 * Synchronous boot path normalization + alternate-shell redirect:
 * - Tauri's asset protocol serves the bundled `index.html` at `/index.html` in default mode,
 *   but `createBrowserRouter` only declares `/`. Collapse the pathname so `MainLayout` matches
 *   on the very first frame instead of stranding the loader window at 290x355.
 * - Persisted `uiMode === "synapseOriginal" | "synapseX"` then forces `/synapse-original/*` or `/synapse-x/*`
 *   before React mounts so the default UI never flashes.
 * - Dialog routes (`/dialog/*`) are excluded by `applyAlternateShellBootPathFromSettings`.
 */
if (typeof window !== "undefined") {
  if (window.location.pathname === "/index.html") {
    window.history.replaceState(window.history.state, "", "/");
  }
  applyAlternateShellBootPathFromSettings();
  /* Keep disk snapshot aligned with localStorage so the next cold start can navigate in Rust before paint. */
  if (isTauri()) {
    void invoke("persist_app_settings_snapshot", {
      snapshot: JSON.stringify(readAppSettings()),
    }).catch(() => {});
  }
}

/** Drop the webview default menu everywhere except Monaco (copy/paste, etc.). */
if (typeof document !== "undefined") {
  document.addEventListener(
    "contextmenu",
    (e) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;
      if (el.closest(".monaco-editor")) return;
      /* Overflow widgets reparented to body (completion list, details, parameter hints) */
      if (el.closest(".suggest-widget")) return;
      if (el.closest(".suggest-details")) return;
      if (el.closest(".suggest-details-container")) return;
      if (el.closest(".parameter-hints-widget")) return;
      /* Radix context menu (script tabs, etc.) */
      if (el.closest('[data-slot="context-menu-trigger"]')) return;
      if (el.closest('[data-slot="context-menu-content"]')) return;
      if (el.closest("[data-radix-popper-content-wrapper]")) return;
      if (el.closest("[data-v3-context-menu-root]")) return;
      e.preventDefault();
    },
    { capture: true },
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
