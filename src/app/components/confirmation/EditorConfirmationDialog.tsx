import { useCallback, useEffect, useMemo, useState } from "react";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import svgPaths from "@/imports/svg-bj8q31w0fn";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "@/branding";
import { cn } from "@/app/components/ui/utils";
import {
  hexToRgbComponents,
  readShellTheme,
  SHELL_THEME_CHANGED_EVENT,
  type ConfirmationDialogThemeState,
  type ShellThemeState,
} from "@/ui/shellTheme";
import {
  CONFIRMATION_DIALOG_REQUEST_SHELL_EVENT,
  CONFIRMATION_DIALOG_SHELL_SNAPSHOT_EVENT,
  EDITOR_CLEAR_DIALOG_RESULT_EVENT,
  type ConfirmationDialogShellSnapshot,
  type EditorClearDialogMode,
  type EditorClearDialogPayload,
} from "@/app/editorClearDialog";
import { isTauriApp } from "@/app/tauriEnv";
import { readAppSettings, shouldApplyEdgeCurve, APP_SETTINGS_CHANGED_EVENT } from "@/app/appSettings";

type Props = {
  mode: EditorClearDialogMode;
};

export default function EditorConfirmationDialog({ mode }: Props) {
  const [theme, setTheme] = useState<ShellThemeState>(() => readShellTheme());
  const ct = theme.confirmationTheme;

  const [settings, setSettings] = useState(readAppSettings);
  useEffect(() => {
    const onSettings = () => setSettings(readAppSettings());
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
    return () => window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
  }, []);

  const applyCurve = shouldApplyEdgeCurve(settings);

  useEffect(() => {
    const sync = () => setTheme(readShellTheme());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
  }, []);

  /** Child webviews may not see main’s localStorage — pull logo fields from the main window once. */
  useEffect(() => {
    if (!isTauriApp()) return;
    const label = getCurrentWindow().label;
    if (
      label !== "dialog-clear-current" &&
      label !== "dialog-close-all-tabs" &&
      label !== "dialog-close-tab"
    ) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen<ConfirmationDialogShellSnapshot>(
        CONFIRMATION_DIALOG_SHELL_SNAPSHOT_EVENT,
        (e) => {
          setTheme((prev) => ({
            ...prev,
            logoDataUrl: e.payload.logoDataUrl ?? prev.logoDataUrl,
            topBarLogoPreset: e.payload.topBarLogoPreset ?? prev.topBarLogoPreset,
          }));
        },
      );
      await emitTo("main", CONFIRMATION_DIALOG_REQUEST_SHELL_EVENT, {});
    })();
    return () => {
      try {
        unlisten?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const topBarLogoSrc = useMemo(() => resolveTopBarLogoUrl(theme), [theme.logoDataUrl, theme.topBarLogoPreset]);
  const topBarLogoIconMark =
    !theme.logoDataUrl && isTopBarIconMarkPreset(theme.topBarLogoPreset);

  useEffect(() => {
    if (!isTauriApp()) return;
    const { r, g, b } = hexToRgbComponents(ct.panelBg);
    void getCurrentWindow().setBackgroundColor([r, g, b]);
  }, [ct.panelBg]);

  const title =
    mode === "current"
      ? ct.clearCurrentTitle
      : mode === "all"
        ? ct.closeAllTitle
        : ct.closeTabTitle;
  const line1 =
    mode === "current"
      ? ct.clearCurrentBodyLine1
      : mode === "all"
        ? ct.closeAllBodyLine1
        : ct.closeTabBodyLine1;
  const line2 =
    mode === "current"
      ? ct.clearCurrentBodyLine2
      : mode === "all"
        ? ct.closeAllBodyLine2
        : ct.closeTabBodyLine2;

  const send = useCallback(
    async (confirmed: boolean) => {
      const payload: EditorClearDialogPayload = { confirmed, mode };
      /** Child webview → main window (label `main`); broadcast `emit` can miss the host listener. */
      if (isTauriApp()) {
        try {
          await emitTo("main", EDITOR_CLEAR_DIALOG_RESULT_EVENT, payload);
        } catch {
          try {
            await emit(EDITOR_CLEAR_DIALOG_RESULT_EVENT, payload);
          } catch {
            /* ignore */
          }
        }
        /**
         * Closing this webview immediately can tear down the sender before the event reaches
         * the main window — Yes/No would appear to do nothing. Defer close until after delivery.
         */
        window.setTimeout(() => {
          void getCurrentWindow().close();
        }, 80);
      } else {
        await emit(EDITOR_CLEAR_DIALOG_RESULT_EVENT, payload);
      }
    },
    [mode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void send(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send]);

  const topBarGradient = `linear-gradient(to bottom, ${ct.topBarFrom}, ${ct.topBarTo})`;
  const tauri = isTauriApp();

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        applyCurve ? "border border-[#414342] border-solid" : "border-none"
      )}
      style={{
        backgroundColor: ct.panelBg,
        borderRadius: applyCurve ? "7px" : "0px",
      }}
    >
      {ct.backgroundMode === "image" && (ct.backgroundImageDataUrl || ct.hasStoredBackgroundImage) ? (
        <ConfirmationDialogBg theme={ct} />
      ) : null}

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="relative z-[3] h-[55px] w-full shrink-0">
          <div
            className="pointer-events-none absolute inset-0 shadow-[0px_8px_15.9px_0px_rgba(0,0,0,0.15)]"
            style={{ background: topBarGradient }}
          />
          {tauri ? (
            <div className="absolute inset-0 z-[1]" data-tauri-drag-region aria-hidden />
          ) : null}
          <div
            className={cn(
              "pointer-events-none absolute left-[11px] z-[2] select-none",
              topBarLogoIconMark ? "top-[5px] h-[46px] w-[46px]" : "top-[9px] h-[37px] w-[175px]",
            )}
          >
            <img
              key={
                theme.logoDataUrl
                  ? `custom-${theme.logoDataUrl.length}-${theme.logoDataUrl.slice(0, 28)}-${theme.logoDataUrl.slice(-28)}`
                  : `preset-${theme.topBarLogoPreset}`
              }
              alt="Synapse"
              draggable={false}
              className="h-full w-full object-contain object-left"
              src={topBarLogoSrc}
              width={800}
              height={167}
              decoding="async"
            />
          </div>
          {tauri ? (
            <div className="absolute right-[5px] top-[9px] z-[4] h-[9px] w-[30px]">
              <div className="relative h-full w-full">
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 z-[1] w-1/2 cursor-default border-0 bg-transparent p-0 outline-none"
                  data-tauri-no-drag
                  aria-label="Minimize"
                  onClick={() => void getCurrentWindow().minimize()}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 z-[1] w-1/2 cursor-default border-0 bg-transparent p-0 outline-none"
                  data-tauri-no-drag
                  aria-label="Close"
                  onClick={() => void send(false)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col items-center px-4 pb-4 pt-3"
          data-tauri-no-drag
        >
          <div className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center">
            <svg className="h-9 w-9" fill="none" viewBox="0 0 36 36" aria-hidden>
              <path
                d={svgPaths.p1e4b3c80}
                stroke={ct.iconStroke}
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <p
            className="mb-2 text-center text-[21px] font-normal leading-normal"
            style={{ color: ct.titleColor }}
          >
            {title}
          </p>
          <div
            className="mb-6 max-w-[480px] text-center text-[16px] font-normal leading-normal"
            style={{ color: ct.bodyColor }}
          >
            <p className="mb-0 whitespace-pre-wrap">{line1}</p>
            <p className="whitespace-pre-wrap">{line2}</p>
          </div>
          <div className="mt-auto flex w-full max-w-[420px] justify-center gap-3">
            <button
              type="button"
              data-tauri-no-drag
              className="h-9 min-w-[91px] border px-3 text-[13px] font-normal shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)]"
              style={{
                borderColor: ct.noButtonBorder,
                color: ct.noButtonText,
                backgroundImage: `linear-gradient(to bottom, ${ct.noButtonFrom}, ${ct.noButtonTo})`,
              }}
              onClick={() => void send(false)}
            >
              No
            </button>
            <button
              type="button"
              data-tauri-no-drag
              className="h-9 min-w-[91px] border px-3 text-[13px] font-normal shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)]"
              style={{
                borderColor: ct.yesButtonBorder,
                color: ct.yesButtonText,
                backgroundImage: `linear-gradient(to bottom, ${ct.yesButtonFrom}, ${ct.yesButtonTo})`,
              }}
              onClick={() => void send(true)}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationDialogBg({ theme }: { theme: ConfirmationDialogThemeState }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    void (async () => {
      if (theme.backgroundImageDataUrl) {
        if (!cancelled) setUrl(theme.backgroundImageDataUrl);
        return;
      }
      if (theme.hasStoredBackgroundImage) {
        const { idbGetConfirmationBackgroundImage } = await import("@/ui/idbVideo");
        const blob = await idbGetConfirmationBackgroundImage();
        if (cancelled || !blob) return;
        const u = URL.createObjectURL(blob);
        revoke = u;
        setUrl(u);
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [theme.backgroundImageDataUrl, theme.hasStoredBackgroundImage]);

  if (!url) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: theme.backgroundOpacity }}
    >
      <img
        alt=""
        src={url}
        className="h-full w-full object-cover"
        style={{ objectPosition: `${theme.backgroundPosition.x}% ${theme.backgroundPosition.y}%` }}
      />
    </div>
  );
}
