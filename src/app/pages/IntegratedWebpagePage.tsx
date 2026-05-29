import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import {
  attachIntegratedSiteWebview,
  detachIntegratedSiteWebview,
  focusIntegratedSiteWebview,
  INTEGRATED_SITE_ZOOM,
  setIntegratedSiteWebviewBounds,
} from "../integratedSiteWebview";
import { useShellChrome } from "../shellChromeContext";
import { isTauriApp } from "../tauriEnv";
import { useAppSettings } from "../useAppSettings";
import { normalizeEmbeddedPageUrl } from "../util/embeddedPageUrl";

/**
 * In Tauri: native child webview over the content area (not iframe)—sites load without frame blocking.
 * In the browser: iframe fallback (some sites may still refuse to embed).
 */
export default function IntegratedWebpagePage() {
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement>(null);
  const { hasPageBackground, pageAreaBg, routeChromeForeground } = useShellChrome();
  const { settings } = useAppSettings();
  const url = normalizeEmbeddedPageUrl(settings.altgenPageUrl);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!url || !isTauriApp()) return;
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;
    let didAttach = false;
    let attachInflight: Promise<void> | null = null;

    const runAttach = (rect: DOMRectReadOnly) => {
      setAttachBusy(true);
      setAttachError(null);
      attachInflight = attachIntegratedSiteWebview(url, rect)
        .then(() => {
          didAttach = true;
          void focusIntegratedSiteWebview();
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          setAttachError(msg);
        })
        .finally(() => {
          attachInflight = null;
          setAttachBusy(false);
        });
      void attachInflight;
    };

    const sync = () => {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      if (!didAttach) {
        if (attachInflight) return;
        runAttach(rect);
      } else {
        void setIntegratedSiteWebviewBounds(rect);
      }
    };

    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    window.addEventListener("resize", sync);
    const onVis = () => {
      if (document.visibilityState === "visible") void focusIntegratedSiteWebview();
    };
    document.addEventListener("visibilitychange", onVis);
    sync();

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", onVis);
      void detachIntegratedSiteWebview();
    };
  }, [url, retryToken]);

  useEffect(() => {
    if (!url || !isTauriApp()) return;
    void focusIntegratedSiteWebview();
  }, [url]);

  if (!url) {
    return <Navigate to="/settings" replace />;
  }

  const hostBg = hasPageBackground ? "transparent" : pageAreaBg;

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ backgroundColor: hasPageBackground ? "transparent" : pageAreaBg }}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/15 px-2 py-1.5">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/90 transition-colors hover:bg-white/10"
          style={{ color: routeChromeForeground }}
        >
          ← Back to Options
        </button>
      </div>

      <div
        ref={hostRef}
        className="relative min-h-0 flex-1 w-full"
        style={{ backgroundColor: hostBg }}
      >
        {isTauriApp() ? (
          <>
            {attachBusy && !attachError ? (
              <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-[11px] text-white/55">
                Loading…
              </div>
            ) : null}
            {attachError ? (
              <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-black/35 px-4 text-center">
                <p className="max-w-md text-[11px] leading-snug text-white/90">{attachError}</p>
                <button
                  type="button"
                  className="rounded border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] text-white hover:bg-white/15"
                  onClick={() => setRetryToken((n) => n + 1)}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div
            className="absolute inset-0 h-full w-full overflow-hidden bg-white"
            style={{ zoom: INTEGRATED_SITE_ZOOM }}
          >
            <iframe title="Integrated webpage" src={url} className="h-full w-full border-0 bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}
