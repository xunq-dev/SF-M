import { useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import synapseLogo from "@/assets/synapse-original/synapse-logo.png?url";
import { isTauriApp } from "@/app/tauriEnv";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import { SYNAPSE_ORIGINAL_SIZES } from "@/app/synapse-original/windowOps";
import { useOgTheme } from "@/app/synapse-original/ogTheme";

/**
 * Synapse Original F9 console — opens as a standalone `synapse-original-console` webview window.
 * Mirrors the bridge log stream consumed by `useExecutorBridge()`; identical level
 * coloring as the default `ConsolePage` (warn = yellow, error = red, info = soft).
 */
export default function SynapseOriginalConsolePage() {
  const { logs, clearLogs } = useExecutorBridge();
  const ogTheme = useOgTheme();
  const allText = useMemo(() => logs.map((l) => l.message).join("\n"), [logs]);
  const { width, height } = SYNAPSE_ORIGINAL_SIZES.console;

  const onCopy = async () => {
    if (!allText) return;
    try {
      if (isTauriApp()) {
        await invoke("write_clipboard_text", { text: allText });
      } else {
        await navigator.clipboard.writeText(allText);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="relative overflow-hidden" style={{ width, height }} data-name="Synapse Original Console">
      <div
        className="absolute"
        style={{ inset: 0, backgroundColor: "var(--og-window-bg, #232323)" }}
      />
      <div
        className="absolute z-[5] left-0 top-0"
        style={{ width, height: 42, backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-tauri-drag-region
      />
      <div
        className="absolute z-[6] flex h-[20px] left-[8px] top-[11px] w-[110px] items-center justify-start overflow-hidden"
        style={{ backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-tauri-drag-region
      >
        <img
          alt=""
          className="pointer-events-none max-h-full max-w-full object-contain object-left"
          src={ogTheme.logoDataUrl ?? synapseLogo}
        />
      </div>
      <p
        className="absolute z-[6] font-['Inter:Regular',sans-serif] font-normal not-italic"
        style={{
          left: 132,
          top: 13,
          fontSize: 14,
          lineHeight: "16px",
          color: "var(--og-text, #ffffff)",
        }}
        data-tauri-drag-region
      >
        F9 Console
      </p>

      <div
        className="absolute z-[7] flex flex-row gap-1"
        style={{ right: 8, top: 9 }}
      >
        <button
          type="button"
          className="cursor-pointer border border-solid border-[#2d2d2d] bg-[#272727] px-2 text-[12px] text-white hover:bg-[#303030] active:bg-[#2a2a2a]"
          style={{ height: 24, minWidth: 56 }}
          onClick={() => void onCopy()}
        >
          Copy
        </button>
        <button
          type="button"
          className="cursor-pointer border border-solid border-[#2d2d2d] bg-[#272727] px-2 text-[12px] text-white hover:bg-[#303030] active:bg-[#2a2a2a]"
          style={{ height: 24, minWidth: 56 }}
          onClick={clearLogs}
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Close"
          className="cursor-pointer border border-solid border-[#2d2d2d] bg-[#272727] px-2 text-[12px] text-white hover:bg-[#303030] active:bg-[#2a2a2a]"
          style={{ height: 24, minWidth: 28 }}
          onClick={() => void getCurrentWindow().close()}
        >
          ×
        </button>
      </div>

      <div
        className="absolute z-[6] overflow-hidden border border-solid border-[#313131] bg-[#1d1d1d]"
        style={{ left: 8, top: 50, width: width - 16, height: height - 58 }}
      >
        <div className="h-full w-full overflow-y-auto overflow-x-hidden px-2 py-2">
          {logs.length === 0 ? (
            <p className="font-['Inter',sans-serif] text-[11px] leading-snug text-[#6e6e6e]">
              No output yet. Attach, run the bridge script for your selected method, then Execute scripts that print/warn.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {logs.map((l, idx) => (
                <li
                  key={`${l.ts}_${idx}`}
                  className="mb-1 whitespace-pre-wrap break-words font-['Consolas','Cascadia_Mono','Courier_New',monospace] text-[11px] leading-snug"
                  style={{
                    color:
                      l.level === "error"
                        ? "#ff7b7b"
                        : l.level === "warn"
                          ? "#ffd27a"
                          : "#c0c0c0",
                  }}
                >
                  {l.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
