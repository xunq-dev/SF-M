const STORAGE_KEY = "synapse.initScreen.completed.v1";

/**
 * One-time-per-session default-shell intro. Stored in sessionStorage so it:
 *   - Replays on every cold start (Tauri's WebView2 wipes sessionStorage on launch).
 *   - Does NOT replay when the user toggles uiMode from OG / Synapse X back to Blue
 *     during a running session (sessionStorage is alive for the lifetime of the webview).
 */
export function readInitScreenCompleted(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeInitScreenCompleted(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
