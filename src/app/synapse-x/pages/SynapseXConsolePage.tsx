import { useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import SynapseXChrome from "@/app/synapse-x/SynapseXChrome";
import { SYNAPSE_X_SIZES } from "@/app/synapse-x/windowOps";

/**
 * Synapse X-styled F9 console — opens as a standalone `synapse-x-console` webview window.
 * Shares the same bridge log stream that drives the default `ConsolePage` and the OG
 * `SynapseOriginalConsolePage`, so identical level coloring (warn = yellow, error = red, info = soft).
 */
export default function SynapseXConsolePage() {
  const { logs, clearLogs } = useExecutorBridge();
  const allText = useMemo(() => logs.map((l) => l.message).join("\n"), [logs]);
  const { width, height } = SYNAPSE_X_SIZES.console;

  const onCopy = useCallback(async () => {
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
  }, [allText]);

  const onClose = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().close();
  }, []);

  return (
    <div className="overflow-hidden" style={{ width, height }}>
      <SynapseXChrome title="Synapse X - F9 Console" variant="console" onClose={onClose}>
        <div className="flex h-full flex-col" style={{ backgroundColor: "var(--sx-window-bg, #333333)" }}>
          <div className="flex shrink-0 flex-row items-center gap-1 border-b border-black/30 px-2 py-1">
            <button
              type="button"
              className="h-[22px] min-w-[56px] cursor-pointer border border-solid border-black/30 px-2 text-[12px] hover:bg-white/10"
              style={{ backgroundColor: "var(--sx-panel-bg, #3C3C3C)", color: "var(--sx-text, #ffffff)" }}
              onClick={() => void onCopy()}
            >
              Copy
            </button>
            <button
              type="button"
              className="h-[22px] min-w-[56px] cursor-pointer border border-solid border-black/30 px-2 text-[12px] hover:bg-white/10"
              style={{ backgroundColor: "var(--sx-panel-bg, #3C3C3C)", color: "var(--sx-text, #ffffff)" }}
              onClick={clearLogs}
            >
              Clear
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden border-t border-black/30 bg-[#1e1e1e]">
            <div className="h-full w-full overflow-y-auto overflow-x-hidden px-2 py-2">
              {logs.length === 0 ? (
                <p className="font-sans text-[11px] leading-snug text-[#6e6e6e]">
                  No output yet. Attach, run the bridge script for your selected method, then Execute scripts that print/warn.
                </p>
              ) : (
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
      </SynapseXChrome>
    </div>
  );
}
