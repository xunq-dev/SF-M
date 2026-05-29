import { readAppSettings } from "./appSettings";

/**
 * Synchronous history fix before React mounts: if persisted `uiMode` is an alternate shell
 * but the location is still under `/` (e.g. opening at `/` or `/settings`), jump to that shell’s
 * loading route so the default `MainLayout` / init screen never paints a frame.
 */
export function applyAlternateShellBootPathFromSettings(): void {
  if (typeof window === "undefined") return;
  try {
    const mode = readAppSettings().uiMode;
    const p = window.location.pathname;
    if (p.startsWith("/dialog")) {
      return;
    }
    if (mode === "synapseOriginal" && !p.startsWith("/synapse-original")) {
      window.history.replaceState(window.history.state, "", "/synapse-original/loading");
    } else if (mode === "synapseX" && !p.startsWith("/synapse-x")) {
      window.history.replaceState(window.history.state, "", "/synapse-x/loading");
    } else if (mode === "synapseV3" && !p.startsWith("/synapse-v3")) {
      window.history.replaceState(window.history.state, "", "/synapse-v3/main");
    }
  } catch {
    /* fail open */
  }
}
