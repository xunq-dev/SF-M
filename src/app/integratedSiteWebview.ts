import { LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

const LABEL = "synapse-integrated-site";

/** ~30% smaller than default page zoom (user preference for embedded site). */
export const INTEGRATED_SITE_ZOOM = 0.7;

let instance: Webview | null = null;

/**
 * Tauri `WebviewOptions` names are swapped vs DOM: `x` = vertical (top), `y` = horizontal (left).
 * `LogicalPosition` / `setPosition` use normal math: x = left, y = top.
 */
function webviewCreateBounds(rect: DOMRectReadOnly) {
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  return {
    x: Math.round(rect.top),
    y: Math.round(rect.left),
    width,
    height,
  };
}

function payloadToErrorMessage(payload: unknown): string {
  if (payload == null) return "Webview creation failed.";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const m = (payload as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return "Webview error.";
  }
}

/**
 * Embeds a URL in a second native webview layered over the main UI (not an iframe), so
 * X-Frame-Options does not apply. Only for Tauri desktop.
 * Resolves after `tauri://created`; rejects on `tauri://error` or timeout.
 */
export async function attachIntegratedSiteWebview(url: string, rect: DOMRectReadOnly): Promise<void> {
  await detachIntegratedSiteWebview();
  const existing = await Webview.getByLabel(LABEL);
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* ignore */
    }
  }

  const { x, y, width, height } = webviewCreateBounds(rect);
  const win = getCurrentWindow();
  let w: Webview;
  try {
    w = new Webview(win, LABEL, {
      url,
      x,
      y,
      width,
      height,
      focus: true,
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
  instance = w;

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      fn();
    };

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Timed out waiting for embedded webview to initialize.")));
    }, 45_000);

    void w.once("tauri://error", (ev) => {
      window.clearTimeout(timeout);
      finish(() => reject(new Error(payloadToErrorMessage(ev.payload))));
    });

    void w.once("tauri://created", () => {
      void (async () => {
        try {
          await w.setBackgroundColor("#ffffff");
          await w.setZoom(INTEGRATED_SITE_ZOOM);
          // Webview.show() requires Tauri `unstable`; child webviews are visible once created.
          await w.setFocus();
          await setIntegratedSiteWebviewBounds(rect);
          window.clearTimeout(timeout);
          finish(() => resolve());
        } catch (e) {
          window.clearTimeout(timeout);
          finish(() => reject(e instanceof Error ? e : new Error(String(e))));
        }
      })();
    });
  });
}

export async function setIntegratedSiteWebviewBounds(rect: DOMRectReadOnly): Promise<void> {
  if (!instance) return;
  const left = Math.round(rect.left);
  const top = Math.round(rect.top);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  try {
    await instance.setPosition(new LogicalPosition(left, top));
    await instance.setSize(new LogicalSize(width, height));
    await instance.setZoom(INTEGRATED_SITE_ZOOM);
  } catch {
    /* webview may be closing */
  }
}

/** Re-focus the embedded webview (e.g. after route becomes visible). */
export async function focusIntegratedSiteWebview(): Promise<void> {
  if (!instance) return;
  try {
    await instance.setFocus();
  } catch {
    /* ignore */
  }
}

export async function detachIntegratedSiteWebview(): Promise<void> {
  if (instance) {
    try {
      await instance.close();
    } catch {
      /* ignore */
    }
    instance = null;
    return;
  }
  const existing = await Webview.getByLabel(LABEL);
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* ignore */
    }
  }
}
