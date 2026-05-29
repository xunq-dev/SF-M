import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { readAppSettings, shouldApplyEdgeCurve } from "@/app/appSettings";

/** Pixel sizes from the Synapse Original Figma mockups; treat these as canonical. The settings window
 * is 140px taller than the original Figma to fit the added "Resizable window" toggle row
 * (+82) and the "Bridge method" dropdown row (+58). */
export const SYNAPSE_ORIGINAL_SIZES = {
  loading: { width: 265, height: 171 },
  main: { width: 838, height: 372 },
  scriptHub: { width: 612, height: 384 },
  settings: { width: 649, height: 705 },
  console: { width: 520, height: 300 },
} as const;

export type SynapseOriginalWindowKey = keyof typeof SYNAPSE_ORIGINAL_SIZES;

/** Synapse Original sub-window labels live in the `synapse-original-*` capability group. */
export const SYNAPSE_ORIGINAL_WINDOW_LABELS = {
  scriptHub: "synapse-original-script-hub",
  settings: "synapse-original-settings",
  console: "synapse-original-console",
} as const;

export type SynapseOriginalSubWindowLabel = (typeof SYNAPSE_ORIGINAL_WINDOW_LABELS)[keyof typeof SYNAPSE_ORIGINAL_WINDOW_LABELS];

/** Force-disable resizing then size the host (main) window. */
export async function setMainWindowSize(width: number, height: number): Promise<void> {
  if (!isTauriApp()) return;
  const win = getCurrentWindow();
  try {
    await win.setResizable(false);
  } catch {
    /* ignore */
  }
  try {
    await win.setSize(new LogicalSize(width, height));
  } catch {
    /* ignore */
  }
}

/** Restore the default UI window: resizable per appSettings, size back to shell defaults. */
export async function restoreDefaultMainWindow(
  defaultWidth: number,
  defaultHeight: number,
): Promise<void> {
  if (!isTauriApp()) return;
  const win = getCurrentWindow();
  const settings = readAppSettings();
  try {
    await win.setSize(new LogicalSize(defaultWidth, defaultHeight));
  } catch {
    /* ignore */
  }
  try {
    await win.setResizable(settings.resizableWindow);
  } catch {
    /* ignore */
  }
}

function viewUrlForRoute(route: string): string {
  const origin = window.location.origin;
  const path = route.startsWith("/") ? route : `/${route}`;
  return `${origin}${path}`;
}

/**
 * Open (or focus + reuse) a synapse-original sub-window for `route` at the given size.
 * Always-on-top from `appSettings.alwaysOnTop` is mirrored to the new window.
 */
export async function openSynapseOriginalWindow(
  label: SynapseOriginalSubWindowLabel,
  route: string,
  width: number,
  height: number,
  title?: string,
): Promise<WebviewWindow | null> {
  if (!isTauriApp()) return null;
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    try {
      await existing.unminimize();
    } catch {
      /* ignore */
    }
    try {
      await existing.setFocus();
    } catch {
      /* ignore */
    }
    return existing;
  }
  const url = viewUrlForRoute(route);
  const settings = readAppSettings();
  const win = new WebviewWindow(label, {
    url,
    title,
    width,
    height,
    resizable: settings.resizableWindow,
    decorations: false,
    shadow: false,
    transparent: true,
    center: true,
    focus: true,
    alwaysOnTop: settings.alwaysOnTop,
  });
  return win;
}

/** Close every synapse-original-* sub-window we know about. Used when toggling Synapse Original mode off. */
export async function closeAllSynapseOriginalSubWindows(): Promise<void> {
  if (!isTauriApp()) return;
  const labels: SynapseOriginalSubWindowLabel[] = [
    SYNAPSE_ORIGINAL_WINDOW_LABELS.scriptHub,
    SYNAPSE_ORIGINAL_WINDOW_LABELS.settings,
    SYNAPSE_ORIGINAL_WINDOW_LABELS.console,
  ];
  await Promise.all(
    labels.map(async (label) => {
      try {
        const w = await WebviewWindow.getByLabel(label);
        if (w) await w.close();
      } catch {
        /* ignore */
      }
    }),
  );
}

/**
 * True if the *current* webview is a synapse-original sub-window (we should not redirect a sub-window
 * back to default routes when the user toggles Synapse Original mode off — close it instead).
 */
export function isSynapseOriginalSubWindow(): boolean {
  if (!isTauriApp()) return false;
  try {
    const label = getCurrentWindow().label;
    return (
      label === SYNAPSE_ORIGINAL_WINDOW_LABELS.scriptHub ||
      label === SYNAPSE_ORIGINAL_WINDOW_LABELS.settings ||
      label === SYNAPSE_ORIGINAL_WINDOW_LABELS.console
    );
  } catch {
    return false;
  }
}

/** True if the current webview is the host (main) window. */
export function isMainWindow(): boolean {
  if (!isTauriApp()) return false;
  try {
    return getCurrentWindow().label === "main";
  } catch {
    return false;
  }
}
