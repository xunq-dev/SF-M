import { useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isMainWindow } from "./synapse-original/windowOps";
import { isTauriApp } from "./tauriEnv";

/** localStorage keys that must sync across Tauri subwindows via the `storage` event. */
export const CROSS_WINDOW_STORAGE_KEYS = {
  appSettings: "synapse.appSettings.v1",
  shellTheme: "synapseOriginal.shellTheme",
  shellLiveEditUi: "synapseOriginal.shellThemeUi.v1",
  sxTheme: "synapse.synapseXTheme.v1",
  sxLiveEditUi: "synapse.synapseXThemeUi.v1",
  ogTheme: "synapse.ogTheme.v1",
  ogLiveEditUi: "synapse.ogThemeUi.v1",
} as const;

/**
 * Re-run `sync` when another window writes one of the watched keys.
 * Custom `dispatchEvent` does not cross webviews; `storage` does.
 */
export function listenCrossWindowStorage(
  keys: readonly string[],
  sync: () => void,
): () => void {
  const keySet = new Set(keys);
  const onStorage = (e: StorageEvent) => {
    if (e.key != null && keySet.has(e.key)) sync();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** React hook: subscribe to cross-window storage updates for the given keys. */
export function useCrossWindowStorageSync(keys: readonly string[], sync: () => void): void {
  useEffect(() => {
    return listenCrossWindowStorage(keys, sync);
  }, [keys, sync]);
}

/** Hard-reload the main webview after settings that require a full remount (e.g. script list toggle). */
export async function reloadMainWebview(): Promise<void> {
  if (!isTauriApp() || isMainWindow()) return;
  try {
    const main = await WebviewWindow.getByLabel("main");
    if (main) await main.reload();
  } catch {
    /* ignore */
  }
}
