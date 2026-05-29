import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readShellTheme, type ShellThemeState } from "@/ui/shellTheme";
import { logicalCenterOnMainWindow } from "./dialogWindowPlacement";
import { isTauriApp } from "./tauriEnv";
import { readAppSettings } from "./appSettings";

export const EDITOR_CLEAR_DIALOG_RESULT_EVENT = "synapse:editor-clear-dialog-result";

/** Dialog webview asks the main window for logo fields (localStorage may not be shared). */
export const CONFIRMATION_DIALOG_REQUEST_SHELL_EVENT = "synapse:confirmation-dialog-request-shell";
/** Main broadcasts logo preset + custom data URL for confirmation dialogs. */
export const CONFIRMATION_DIALOG_SHELL_SNAPSHOT_EVENT = "synapse:confirmation-dialog-shell-snapshot";

export type ConfirmationDialogShellSnapshot = Pick<ShellThemeState, "logoDataUrl" | "topBarLogoPreset">;

export type EditorClearDialogMode = "current" | "all" | "tab";

export type EditorClearDialogPayload = {
  confirmed: boolean;
  mode: EditorClearDialogMode;
};

function dialogPath(mode: EditorClearDialogMode): string {
  if (mode === "current") return "/dialog/clear-current";
  if (mode === "tab") return "/dialog/close-tab";
  return "/dialog/close-all-tabs";
}

function dialogLabel(mode: EditorClearDialogMode): string {
  if (mode === "current") return "dialog-clear-current";
  if (mode === "tab") return "dialog-close-tab";
  return "dialog-close-all-tabs";
}

function browserConfirmMessage(mode: EditorClearDialogMode): string {
  const t = readShellTheme().confirmationTheme;
  if (mode === "current") {
    return `${t.clearCurrentTitle}\n\n${t.clearCurrentBodyLine1}\n${t.clearCurrentBodyLine2}`;
  }
  if (mode === "tab") {
    return `${t.closeTabTitle}\n\n${t.closeTabBodyLine1}\n${t.closeTabBodyLine2}`;
  }
  return `${t.closeAllTitle}\n\n${t.closeAllBodyLine1}\n${t.closeAllBodyLine2}`;
}

/**
 * Shows the appropriate confirmation (browser `confirm` or separate Tauri `WebviewWindow`).
 * Resolves `true` if the user confirms, `false` if cancelled or dialog closed without confirming.
 *
 * Synapse V3 is a confirmation-free shell by design — closing or clearing always succeeds
 * silently. We short-circuit here so a Blue-themed dialog can never leak through, no matter
 * which call site reaches us.
 */
export async function confirmEditorClear(mode: EditorClearDialogMode): Promise<boolean> {
  if (readAppSettings().uiMode === "synapseV3") {
    return true;
  }

  if (!isTauriApp()) {
    return window.confirm(browserConfirmMessage(mode));
  }

  const label = dialogLabel(mode);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* ignore */
    }
  }

  const theme = readShellTheme().confirmationTheme;
  const w = theme.windowWidthPx;
  const h = theme.windowHeightPx;
  const origin = window.location.origin;
  const path = dialogPath(mode);
  const url = `${origin}${path.startsWith("/") ? "" : "/"}${path}`;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let unlistenFn: (() => void) | undefined;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        unlistenFn?.();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    void (async () => {
      try {
        unlistenFn = await listen<EditorClearDialogPayload>(EDITOR_CLEAR_DIALOG_RESULT_EVENT, (e) => {
          if (e.payload.mode !== mode) return;
          finish(e.payload.confirmed);
        });
      } catch {
        finish(false);
        return;
      }

      const { x, y } = await logicalCenterOnMainWindow(w, h);
      const win = new WebviewWindow(label, {
        url,
        width: w,
        height: h,
        x,
        y,
        center: false,
        resizable: false,
        decorations: false,
        shadow: false,
        transparent: true,
        focus: true,
        alwaysOnTop: true,
      });

      void win.once("tauri://error", () => {
        try {
          unlistenFn?.();
        } catch {
          /* ignore */
        }
        unlistenFn = undefined;
        if (!settled) {
          finish(false);
        }
      });
    })();
  });
}
