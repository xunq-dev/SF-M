import { isTauri } from "@tauri-apps/api/core";

/** True when running inside the Tauri webview (not a normal browser tab). */
export function isTauriApp(): boolean {
  return isTauri();
}
