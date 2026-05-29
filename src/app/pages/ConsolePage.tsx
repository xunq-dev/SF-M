import { ShellFitLine } from "../components/ShellFitLine";
import { useShellChrome } from "../shellChromeContext";
import { useExecutorBridge } from "../executorBridge/ExecutorBridgeContext";
import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "../tauriEnv";

export default function ConsolePage() {
  const { hasPageBackground, pageAreaBg, shellTheme, routeChromeForeground } = useShellChrome();
  const { logs, clearLogs } = useExecutorBridge();
  const surf = shellTheme.surfaceElementsTheme;
  const [clearHover, setClearHover] = useState(false);
  const [copyHover, setCopyHover] = useState(false);

  const allLogsText = useMemo(() => logs.map((l) => l.message).join("\n"), [logs]);

  const baseStyle = useMemo(() => {
    return {
      borderColor: shellTheme.editorControlBarBorder,
      color: shellTheme.editorControlBarText,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.editorControlBarButtonFrom}, ${shellTheme.editorControlBarButtonTo})`,
    };
  }, [
    shellTheme.editorControlBarBorder,
    shellTheme.editorControlBarText,
    shellTheme.editorControlBarButtonFrom,
    shellTheme.editorControlBarButtonTo,
  ]);

  const hoverStyle = useMemo(() => {
    return {
      ...baseStyle,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.editorControlBarHoverFrom}, ${shellTheme.editorControlBarHoverTo})`,
    };
  }, [baseStyle, shellTheme.editorControlBarHoverFrom, shellTheme.editorControlBarHoverTo]);

  const clearStyle = useMemo(() => {
    const base = {
      ...baseStyle,
    };
    if (!clearHover) return base;
    return {
      ...base,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.attachButtonHoverFrom}, ${shellTheme.attachButtonHoverTo})`,
    };
  }, [
    baseStyle,
    clearHover,
    shellTheme.attachButtonHoverFrom,
    shellTheme.attachButtonHoverTo,
  ]);

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col px-[7px] pb-[7px] pt-[7px]"
      style={{ backgroundColor: hasPageBackground ? "transparent" : pageAreaBg }}
    >
      <div className="flex min-w-0 shrink-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-normal" style={{ color: routeChromeForeground }}>
          <ShellFitLine basePx={22} fitOptions={{ minPx: 7 }}>
            F9 Console
          </ShellFitLine>
        </p>
        <div className="flex shrink-0 gap-[4px]">
          <button
            type="button"
            className="flex h-[36px] w-[91px] shrink-0 items-center justify-center border px-0.5"
            style={copyHover ? hoverStyle : baseStyle}
            onMouseEnter={() => setCopyHover(true)}
            onMouseLeave={() => setCopyHover(false)}
            onClick={() => {
              void (async () => {
                try {
                  const text = allLogsText;
                  if (!text) return;
                  if (isTauriApp()) {
                    await invoke("write_clipboard_text", { text });
                  } else {
                    await navigator.clipboard.writeText(text);
                  }
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : String(e));
                }
              })();
            }}
          >
            <ShellFitLine basePx={13} fitOptions={{ minPx: 6 }} className="font-normal">
              Copy
            </ShellFitLine>
          </button>

          <button
            type="button"
            className="flex h-[36px] w-[91px] shrink-0 items-center justify-center border px-0.5 transition-[background-image] duration-150"
            style={clearStyle}
            onMouseEnter={() => setClearHover(true)}
            onMouseLeave={() => setClearHover(false)}
            onClick={clearLogs}
          >
            <ShellFitLine basePx={13} fitOptions={{ minPx: 6 }} className="font-normal">
              Clear
            </ShellFitLine>
          </button>
        </div>
      </div>

      <div
        className="mt-[6px] min-h-0 flex-1 rounded-[2px] border overflow-hidden"
        style={{
          backgroundColor: surf.surfacePanelBackground,
          borderColor: surf.surfacePanelBorder,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="shell-script-browser-scroll shell-console-output h-full w-full overflow-x-hidden overflow-y-auto px-2 py-2">
          {logs.length === 0 ? (
            <p className="text-[11px] opacity-70" style={{ color: surf.surfaceListText }}>
              No output yet. Attach, run the bridge script for your selected method, then Execute scripts that print/warn.
            </p>
          ) : null}
          <ul className="m-0 list-none p-0">
            {logs.map((l, idx) => (
              <li
                key={`${l.ts}_${idx}`}
                className="mb-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-snug"
                style={{
                  color:
                    l.level === "error"
                      ? "#ff7b7b"
                      : l.level === "warn"
                        ? "#ffd27a"
                        : surf.surfaceListText,
                }}
              >
                {l.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}