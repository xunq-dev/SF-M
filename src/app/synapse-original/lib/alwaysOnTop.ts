import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { readAppSettings, writeAppSettings } from "@/app/appSettings";

/**
 * Synapse Original mode persists always-on-top in the shared `AppSettings.alwaysOnTop` flag (localStorage).
 * The default UI's SettingsPage already reads/writes this same flag, so toggling here
 * also reflects in the default settings (and vice versa) once the user switches modes.
 */
export function alwaysOnTopIsEnabled(): boolean {
  return readAppSettings().alwaysOnTop;
}

/** Apply `enabled` to every synapse-original + main webview window currently alive. */
export async function applyAlwaysOnTopGlobally(enabled: boolean): Promise<void> {
  writeAppSettings({ alwaysOnTop: enabled });
  if (!isTauriApp()) return;
  try {
    await getCurrentWindow().setAlwaysOnTop(enabled);
  } catch {
    /* ignore */
  }
  try {
    const wins = await WebviewWindow.getAll();
    await Promise.all(
      wins.map(async (w) => {
        try {
          await w.setAlwaysOnTop(enabled);
        } catch {
          /* ignore — window may be closing */
        }
      }),
    );
  } catch {
    /* getAll() can fail in dev under HMR */
  }
}

/** Apply the persisted always-on-top to *this* webview only (call on each window mount). */
export async function syncCurrentWindowAlwaysOnTop(): Promise<void> {
  if (!isTauriApp()) return;
  const enabled = alwaysOnTopIsEnabled();
  try {
    const win = getCurrentWindow();
    if (enabled) {
      await win.setAlwaysOnBottom(false);
    }
    await win.setAlwaysOnTop(enabled);
  } catch {
    /* ignore */
  }
}

/**
 * Windows/WebView2 often ignores the first `setAlwaysOnTop(true)` at cold start (including
 * when Rust sets `.always_on_top(true)` on the window builder). Toggling off then on fixes it.
 */
export async function refreshCurrentWindowAlwaysOnTop(): Promise<void> {
  if (!isTauriApp() || !alwaysOnTopIsEnabled()) return;
  try {
    const win = getCurrentWindow();
    await win.setAlwaysOnBottom(false);
    await win.setAlwaysOnTop(false);
    await win.setAlwaysOnTop(true);
  } catch {
    /* ignore */
  }
}

let launchTopmostRefreshQueued = false;

/** Run a launch-time topmost refresh after layout effects / init sizing have settled. */
export function scheduleLaunchAlwaysOnTopRefresh(): void {
  if (!isTauriApp() || !alwaysOnTopIsEnabled() || launchTopmostRefreshQueued) return;
  launchTopmostRefreshQueued = true;
  queueMicrotask(() => {
    launchTopmostRefreshQueued = false;
    void refreshCurrentWindowAlwaysOnTop();
  });
}
