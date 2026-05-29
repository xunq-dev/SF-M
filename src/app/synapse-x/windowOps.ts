import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { readAppSettings, shouldApplyEdgeCurve } from "@/app/appSettings";

/** Pixel sizes from Synapse X WPF surfaces; Settings + Script Hub grow to OG dimensions
 * to fit the parity layout (sidebar tabs + ScriptBlox), Console matches OG. */
export const SYNAPSE_X_SIZES = {
  loading: { width: 418, height: 117 },
  main: { width: 801, height: 355 },
  scriptHub: { width: 612, height: 384 },
  settings: { width: 528, height: 460 },
  console: { width: 520, height: 300 },
} as const;

/** Labels must match `synapse-x-*` entries in Tauri capabilities. */
export const SYNAPSE_X_WINDOW_LABELS = {
  scriptHub: "synapse-x-script-hub",
  settings: "synapse-x-settings",
  console: "synapse-x-console",
} as const;

export type SynapseXSubWindowLabel =
  (typeof SYNAPSE_X_WINDOW_LABELS)[keyof typeof SYNAPSE_X_WINDOW_LABELS];

function viewUrlForRoute(route: string): string {
  const origin = window.location.origin;
  const path = route.startsWith("/") ? route : `/${route}`;
  return `${origin}${path}`;
}

/** Open or focus a Synapse X companion window (mirrors `openSynapseOriginalWindow`). */
export async function openSynapseXWindow(
  label: SynapseXSubWindowLabel,
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
  return new WebviewWindow(label, {
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
}

export async function closeAllSynapseXSubWindows(): Promise<void> {
  if (!isTauriApp()) return;
  const labels: SynapseXSubWindowLabel[] = [
    SYNAPSE_X_WINDOW_LABELS.scriptHub,
    SYNAPSE_X_WINDOW_LABELS.settings,
    SYNAPSE_X_WINDOW_LABELS.console,
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

export function isSynapseXSubWindow(): boolean {
  if (!isTauriApp()) return false;
  try {
    const label = getCurrentWindow().label;
    return (
      label === SYNAPSE_X_WINDOW_LABELS.scriptHub ||
      label === SYNAPSE_X_WINDOW_LABELS.settings ||
      label === SYNAPSE_X_WINDOW_LABELS.console
    );
  } catch {
    return false;
  }
}
