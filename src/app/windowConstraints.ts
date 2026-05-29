import { LogicalSize, PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "@/ui/shellChromeGeometry";
import { readAppSettings } from "@/app/appSettings";
import { SYNAPSE_ORIGINAL_SIZES } from "@/app/synapse-original/windowOps";
import { SYNAPSE_X_SIZES } from "@/app/synapse-x/windowOps";
import { SYNAPSE_V3_MAIN_SIZE } from "@/app/synapse-v3/v3WindowOps";
import { readInitScreenCompleted } from "@/app/initScreenStorage";

/**
 * True only when the main window is currently displaying a "main UI" route, not a loader.
 * Loaders (`/synapse-original/loading`, `/synapse-x/loading`, Blue InitScreen at `/`) need null min size
 * so they can shrink below the canonical main-shell dimensions.
 */
export function shouldApplyMainShellMinSize(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (path.startsWith("/synapse-original/loading") || path.startsWith("/synapse-x/loading")) return false;
  // Blue: "/" path covers both pre-init InitScreen and post-init main UI; init flag distinguishes.
  if (path === "/" && !readInitScreenCompleted()) return false;
  return true;
}

/**
 * Canonical "main page" size for whichever shell is currently active. When the user enables
 * Resizable, this becomes the lower bound on the main window so dragging an edge can never
 * shrink the chrome below the design size.
 */
export function getMainShellMinSize(): { width: number; height: number } {
  const mode = readAppSettings().uiMode;
  if (mode === "synapseOriginal") {
    return { width: SYNAPSE_ORIGINAL_SIZES.main.width, height: SYNAPSE_ORIGINAL_SIZES.main.height };
  }
  if (mode === "synapseX") {
    return { width: SYNAPSE_X_SIZES.main.width, height: SYNAPSE_X_SIZES.main.height };
  }
  if (mode === "synapseV3") {
    return { width: SYNAPSE_V3_MAIN_SIZE.width, height: SYNAPSE_V3_MAIN_SIZE.height };
  }
  return { width: SHELL_CHROME_WIDTH, height: SHELL_CHROME_HEIGHT };
}

/** Apply minimum window size when the shell is resizable (Tauri desktop). Reads the active
 * mode lazily so the bound automatically tracks Blue / OG / Synapse X main dimensions. */
export async function applyShellWindowMinSize(resizable: boolean): Promise<void> {
  const win = getCurrentWindow();
  if (resizable) {
    const { width, height } = getMainShellMinSize();
    await win.setMinSize(new LogicalSize(width, height));
  } else {
    await win.setMinSize(null);
  }
}

/**
 * Keep the window within the monitor work area and at least the active shell's main size
 * (physical px). Re-evaluates the shell minimum on every call so toggling `uiMode` mid-session
 * doesn't strand stale bounds.
 */
export async function clampWindowSizeToShellAndMonitor(
  resizable: boolean,
  size: { width: number; height: number },
): Promise<void> {
  if (!resizable) return;
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const { width: minW, height: minH } = getMainShellMinSize();
  const minP = new LogicalSize(minW, minH).toPhysical(scale);
  const mon = await currentMonitor();
  const work = mon?.workArea.size;
  const maxW = work?.width ?? 1_000_000;
  const maxH = work?.height ?? 1_000_000;
  let w = size.width;
  let h = size.height;
  w = Math.min(maxW, Math.max(minP.width, w));
  h = Math.min(maxH, Math.max(minP.height, h));
  if (w !== size.width || h !== size.height) {
    await win.setSize(new PhysicalSize(w, h));
  }
}

/**
 * Shared `dblclick` handler for title-bar drag regions across all three shells. Toggles the
 * native maximize state when (and only when) the user has enabled `resizableWindow`. No-ops
 * outside Tauri or when the API call fails.
 */
export async function dblClickMaximizeIfResizable(): Promise<void> {
  if (!readAppSettings().resizableWindow) return;
  try {
    await getCurrentWindow().toggleMaximize();
  } catch {
    /* missing capability or detached window — silent */
  }
}
