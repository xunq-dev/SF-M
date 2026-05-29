import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import scriptPreviewFallback from "@/assets/synapse-original/script-preview.png?url";
import { isTauriApp } from "@/app/tauriEnv";
import { readAppSettings } from "@/app/appSettings";
import type { BridgeStatus } from "@/app/executorBridge/ExecutorBridgeContext";
import {
  synapseLegacyScripts,
  type SynapseLegacyScript,
} from "@/app/scriptHub/synapseLegacyScripts";
import {
  fetchScriptBloxPage,
  fetchScriptBloxScriptBody,
  scriptBloxCardImageUrl,
  type ScriptBloxScript,
} from "@/app/scriptHub/scriptBloxApi";
import SynapseXChrome from "@/app/synapse-x/SynapseXChrome";

type HubTab = "synapse" | "scriptblox";

type SelectedRun =
  | { kind: "synapse"; entry: SynapseLegacyScript }
  | { kind: "scriptblox"; entry: ScriptBloxScript };

const PANEL_BG = "var(--sx-panel-bg, #3C3C3C)";

/**
 * Synapse X Script Hub — feature parity with `SynapseOriginalScriptHubPage` (same `synapseLegacyScripts`,
 * same ScriptBlox search wiring, same `bridge_send_execute` run path) restyled in WPF
 * `#333333` / `#3C3C3C` chrome at 612x384.
 */
export default function SynapseXScriptHubPage() {
  const [tab, setTab] = useState<HubTab>("synapse");
  const [scriptbloxQuery, setScriptbloxQuery] = useState("");
  const [scriptbloxScripts, setScriptbloxScripts] = useState<ScriptBloxScript[]>([]);
  const [scriptbloxLoading, setScriptbloxLoading] = useState(false);
  const [scriptbloxError, setScriptbloxError] = useState<string | null>(null);
  const [selectedSynapseId, setSelectedSynapseId] = useState<string | null>(
    synapseLegacyScripts[0]?.name ?? null,
  );
  const [selectedBloxId, setSelectedBloxId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);

  const loadScriptblox = useCallback(async (query: string) => {
    setScriptbloxLoading(true);
    setScriptbloxError(null);
    try {
      const { scripts } = await fetchScriptBloxPage({ query, page: 1 });
      setScriptbloxScripts(scripts);
    } catch (e) {
      console.error(e);
      setScriptbloxScripts([]);
      setScriptbloxError("Could not reach ScriptBlox (network, CORS, or API error).");
    } finally {
      setScriptbloxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "scriptblox") return;
    if (scriptbloxScripts.length || scriptbloxLoading) return;
    void loadScriptblox("");
  }, [tab, scriptbloxScripts.length, scriptbloxLoading, loadScriptblox]);

  const filteredScriptblox = useMemo(() => {
    const q = scriptbloxQuery.trim().toLowerCase();
    if (!q) return scriptbloxScripts;
    return scriptbloxScripts.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.game?.name ?? "").toLowerCase().includes(q),
    );
  }, [scriptbloxQuery, scriptbloxScripts]);

  const selected = useMemo<SelectedRun | null>(() => {
    if (tab === "synapse") {
      const e = synapseLegacyScripts.find((s) => s.name === selectedSynapseId) ?? null;
      return e ? { kind: "synapse", entry: e } : null;
    }
    const e = filteredScriptblox.find((s) => s._id === selectedBloxId) ?? null;
    return e ? { kind: "scriptblox", entry: e } : null;
  }, [tab, selectedSynapseId, selectedBloxId, filteredScriptblox]);

  const previewImage = useMemo(() => {
    if (!selected) return scriptPreviewFallback;
    if (selected.kind === "synapse") return selected.entry.thumb;
    return scriptBloxCardImageUrl(selected.entry);
  }, [selected]);

  const previewDescription = useMemo(() => {
    if (!selected) {
      if (tab === "synapse") return "Pick a script on the left to preview it.";
      if (scriptbloxLoading) return "Loading ScriptBlox catalogue…";
      if (scriptbloxError) return scriptbloxError;
      return "Pick a script on the left to preview it.";
    }
    if (selected.kind === "synapse") return selected.entry.desc;
    const game = selected.entry.game?.name ?? "Global Script";
    return `${selected.entry.title}\nGame: ${game}`;
  }, [selected, tab, scriptbloxLoading, scriptbloxError]);

  const onRun = useCallback(async () => {
    if (!selected || running) return;
    setRunning(true);
    setRunErr(null);
    try {
      if (!isTauriApp()) {
        setRunErr("Bridge is desktop-only.");
        return;
      }
      let body = "";
      let title = "";
      if (selected.kind === "synapse") {
        body = selected.entry.code;
        title = selected.entry.name;
      } else {
        const inline =
          typeof selected.entry.script === "string" ? selected.entry.script.trim() : "";
        body = inline || (await fetchScriptBloxScriptBody(selected.entry._id)).trim();
        title = selected.entry.title;
      }
      if (!body.trim()) {
        setRunErr("Empty script — nothing to run.");
        return;
      }
      // Sub-window: bypass per-window attach state. Main window owns the attach UX, so we only
      // check the live Rust bridge connection before sending — matches SynapseOriginalScriptHubPage.
      const method = readAppSettings().bridgeMethod;
      if (method === "macos" || method === "macsploit" || method === "opiumware") {
        const [macStatus, opiumStatus] = await Promise.all([
          invoke<{ connected: boolean; port: number | null; last_error: string | null }>("macsploit_status"),
          invoke<{ connected: boolean; port: number | null; last_error: string | null }>("opiumware_status"),
        ]);
        const executor = opiumStatus.connected ? "opiumware" : macStatus.connected ? "macsploit" : null;
        if (!executor) {
          setRunErr(`Bridge not connected. Click Attach in the main window, then try again.`);
          return;
        }
        await invoke(`${executor}_execute`, { script: body });
        setRunErr(`Sent: ${title}`);
        return;
      }

      const status = await invoke<BridgeStatus>("bridge_status");
      const isUp =
        method === "port" ? !!status.port_connected : !!status.connected || !!status.matcha_connected;
      if (!isUp) {
        const luaName = method === "port" ? "Port Bridge.lua" : "Websocket Bridge.lua";
        setRunErr(`Bridge not connected. Click Attach in the main window, then run ${luaName}.`);
        return;
      }
      await invoke<string>("bridge_send_execute", { source: body, method });
      setRunErr(`Sent: ${title}`);
    } catch (e) {
      setRunErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [selected, running]);

  const onMinimize = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().minimize();
  }, []);

  return (
    <div className="overflow-hidden" style={{ width: 612, height: 384 }}>
      <SynapseXChrome title="Synapse X - Script Hub" variant="scriptHub" onMinimize={onMinimize}>
        <div
          className="flex h-full min-h-0 flex-row gap-2 px-2 pb-2 pt-2"
          style={{ backgroundColor: "var(--sx-window-bg, #333333)" }}
          data-sx-live-fallback="windowBg"
        >
          {/* Left tabs */}
          <div className="flex w-[100px] shrink-0 flex-col gap-1">
            <ScriptHubTabBtn label="Synapse Hub" active={tab === "synapse"} onClick={() => setTab("synapse")} />
            <ScriptHubTabBtn label="ScriptBlox" active={tab === "scriptblox"} onClick={() => setTab("scriptblox")} />
          </div>

          {/* Script list panel */}
          <div
            className="box-border flex h-full w-[171px] shrink-0 flex-col gap-1 border border-solid border-[#212120] px-1.5 py-1.5"
            style={{ backgroundColor: PANEL_BG }}
            data-sx-live="panelBg"
          >
            {tab === "scriptblox" ? (
              <>
                <input
                  type="search"
                  value={scriptbloxQuery}
                  onChange={(e) => setScriptbloxQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadScriptblox(scriptbloxQuery);
                  }}
                  placeholder="Search ScriptBlox…"
                  aria-label="Search ScriptBlox scripts"
                  className="box-border h-[26px] w-full shrink-0 border border-solid border-[#2a2a2a] bg-[#2d2d2d] px-1.5 font-sans text-[11px] leading-none text-[#c0c0c0] outline-none placeholder:text-[#6e6e6e] focus:border-[#3a3a3a]"
                />
                <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overflow-x-hidden">
                  {scriptbloxLoading ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[#a3a3a3]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-sans text-[10px]">Loading…</span>
                    </div>
                  ) : scriptbloxError ? (
                    <p className="shrink-0 px-0.5 font-sans text-[10px] leading-snug text-[#cc6e6e]">
                      {scriptbloxError}
                    </p>
                  ) : filteredScriptblox.length === 0 ? (
                    <p className="shrink-0 px-0.5 font-sans text-[10px] leading-snug text-[#6e6e6e]">
                      {scriptbloxQuery.trim() ? "No matches." : "Empty page."}
                    </p>
                  ) : (
                    filteredScriptblox.map((entry) => {
                      const sel = selectedBloxId === entry._id;
                      return (
                        <button
                          key={entry._id}
                          type="button"
                          title={entry.title}
                          className={`shrink-0 w-full whitespace-normal break-words py-1.5 text-left font-sans text-[11px] leading-snug ${
                            sel ? "bg-[#4a4a4a] text-[#e8e8e8]" : "text-[#c0c0c0] hover:bg-[#333333]"
                          }`}
                          onClick={() => setSelectedBloxId(entry._id)}
                        >
                          {entry.title}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overflow-x-hidden">
                {synapseLegacyScripts.map((entry) => {
                  const sel = selectedSynapseId === entry.name;
                  return (
                    <button
                      key={entry.name}
                      type="button"
                      title={entry.name}
                      className={`shrink-0 w-full whitespace-normal break-words py-1.5 text-left font-sans text-[11px] leading-snug ${
                        sel ? "bg-[#4a4a4a] text-[#e8e8e8]" : "text-[#c0c0c0] hover:bg-[#333333]"
                      }`}
                      onClick={() => setSelectedSynapseId(entry.name)}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview + description column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className="h-[162px] w-full shrink-0 overflow-hidden border border-solid border-[#212120] bg-[#252525]">
              {tab === "scriptblox" && scriptbloxLoading ? (
                <div className="flex h-full w-full animate-pulse items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#a3a3a3]" />
                </div>
              ) : (
                <img
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                  src={previewImage}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = scriptPreviewFallback;
                  }}
                />
              )}
            </div>

            <div
              className="box-border flex min-h-0 flex-1 flex-col border border-solid border-[#212120] px-2 py-2"
              style={{ backgroundColor: PANEL_BG }}
            >
              <p className="m-0 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[13px] font-normal leading-snug text-[#c0c0c0]">
                {previewDescription}
              </p>
              {runErr ? (
                <p className="mt-1 shrink-0 text-[11px] text-[#cc6e6e]">{runErr}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-row gap-2">
              <button
                type="button"
                onClick={() => void onRun()}
                disabled={!selected || running}
                className="h-[33px] flex-1 cursor-pointer border border-solid border-[#2a2a2a] px-2 text-[13px] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: PANEL_BG, color: "var(--sx-text, #ffffff)" }}
              >
                {running ? "Running…" : "Run Script"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isTauriApp()) return;
                  void getCurrentWindow().close();
                }}
                className="h-[33px] flex-1 cursor-pointer border border-solid border-[#2a2a2a] px-2 text-[13px] hover:brightness-110"
                style={{ backgroundColor: PANEL_BG, color: "var(--sx-text, #ffffff)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </SynapseXChrome>
    </div>
  );
}

function ScriptHubTabBtn(props: { label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={props.active}
      onClick={props.onClick}
      className="flex h-[33px] cursor-pointer items-center justify-center border border-solid px-2 text-[13px] hover:brightness-110"
      style={{
        backgroundColor: props.active ? "#4a4a4a" : "var(--sx-panel-bg, #3C3C3C)",
        borderColor: props.active ? "#5a5a5a" : "#2a2a2a",
        color: "var(--sx-text, #ffffff)",
      }}
      data-sx-live={props.active ? "tabActiveBg" : "tabBg"}
    >
      <span data-sx-live="buttonText">{props.label}</span>
    </button>
  );
}
