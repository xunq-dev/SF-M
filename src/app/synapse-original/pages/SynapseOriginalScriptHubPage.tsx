import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import synapseLogo from "@/assets/synapse-original/synapse-logo.png?url";
import scriptPreviewFallback from "@/assets/synapse-original/script-preview.png?url";
import { isTauriApp } from "@/app/tauriEnv";
import { useOgTheme } from "@/app/synapse-original/ogTheme";
import { readAppSettings } from "@/app/appSettings";
import type { BridgeStatus } from "@/app/executorBridge/ExecutorBridgeContext";
import { synapseLegacyScripts, type SynapseLegacyScript } from "@/app/scriptHub/synapseLegacyScripts";
import {
  fetchScriptBloxPage,
  fetchScriptBloxScriptBody,
  scriptBloxCardImageUrl,
  type ScriptBloxScript,
} from "@/app/scriptHub/scriptBloxApi";

type HubTab = "synapse" | "scriptblox";

type SelectedRun =
  | { kind: "synapse"; entry: SynapseLegacyScript }
  | { kind: "scriptblox"; entry: ScriptBloxScript };

/**
 * Synapse Original Script Hub — pixel-accurate (612x384) port of the Figma `ScriptHubWindow`
 * mockup wired to live data:
 *  - Synapse Hub: featured local scripts from `synapseLegacyScripts` (with images).
 *  - ScriptBlox: live community scripts via `fetchScriptBloxPage`, with a search input and
 *    a Loader2 spinner that replaces the list while pages load.
 *  - Run Script: pushes the selected entry's source through `bridge.execute()`.
 */
export default function SynapseOriginalScriptHubPage() {
  const ogTheme = useOgTheme();
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

  /** Lazy-load ScriptBlox once user actually opens that tab. */
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
      // Sub-window: bypass per-window attach state. The main window owns the attach UX,
      // so we only check the live Rust bridge connection before sending.
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

  return (
    <div className="relative overflow-hidden" style={{ width: 612, height: 384 }} data-name="Script Hub Window">
      <div
        className="absolute h-[384px] left-0 top-0 w-[612px]"
        style={{ backgroundColor: "var(--og-window-bg, #232323)" }}
      />

      {/* Left tabs */}
      <div className="absolute contents left-[6px] top-[64px]">
        <button
          type="button"
          className="absolute left-[6px] top-[64px] h-[36.81px] w-[93.818px] cursor-pointer border-0 bg-transparent p-0"
          aria-pressed={tab === "synapse"}
          onClick={() => setTab("synapse")}
        />
        <div
          className={`pointer-events-none absolute border border-solid h-[36.81px] left-[6px] top-[64px] w-[93.818px] ${
            tab === "synapse" ? "border-[#3a3a3a] bg-[#323232]" : "border-[#2d2d2d] bg-[#272727]"
          }`}
        />
        <p className="pointer-events-none absolute font-['Inter:Regular',sans-serif] font-normal h-[17px] leading-[normal] left-[12px] not-italic text-[13px] text-white top-[73px] w-[83px]">
          Synapse Hub
        </p>
      </div>

      <div className="absolute contents left-[6px] top-[111px]">
        <button
          type="button"
          className="absolute left-[6px] top-[111px] z-[2] h-[36.81px] w-[94px] cursor-pointer border-0 bg-transparent p-0"
          aria-pressed={tab === "scriptblox"}
          onClick={() => setTab("scriptblox")}
        />
        <div
          className={`pointer-events-none absolute border border-solid h-[36.81px] left-[6px] top-[111px] w-[94px] ${
            tab === "scriptblox" ? "border-[#3a3a3a] bg-[#323232]" : "border-[#2d2d2d] bg-[#272727]"
          }`}
        />
        <p className="pointer-events-none absolute font-['Inter:Regular',sans-serif] font-normal h-[17px] leading-[normal] left-[19px] not-italic text-[14px] text-white top-[120px] w-[68px]">
          ScriptBlox
        </p>
      </div>

      {/* Script list panel */}
      <div
        className="absolute left-[109px] top-[63px] z-[1] box-border flex h-[315px] w-[171px] flex-col gap-1 border border-solid border-[#212120] bg-[#282827] px-1.5 py-1.5"
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
              className="box-border h-[26px] w-full shrink-0 border border-solid border-[#2d2d2d] bg-[#272727] px-1.5 font-['Inter',sans-serif] text-[11px] leading-none text-[#c0c0c0] outline-none placeholder:text-[#6e6e6e] focus:border-[#3a3a3a] focus:bg-[#2a2a2a]"
            />
            <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overflow-x-hidden">
              {scriptbloxLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[#a3a3a3]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-['Inter',sans-serif] text-[10px]">Loading…</span>
                </div>
              ) : scriptbloxError ? (
                <p className="shrink-0 px-0.5 font-['Inter',sans-serif] text-[10px] leading-snug text-[#cc6e6e]">
                  {scriptbloxError}
                </p>
              ) : filteredScriptblox.length === 0 ? (
                <p className="shrink-0 px-0.5 font-['Inter',sans-serif] text-[10px] leading-snug text-[#6e6e6e]">
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
                      className={`shrink-0 w-full whitespace-normal break-words py-1.5 text-left font-['Inter',sans-serif] text-[11px] leading-snug ${
                        sel ? "bg-[#3c3c3c] text-[#e8e8e8]" : "text-[#c0c0c0] hover:bg-[#333333]"
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
                  className={`shrink-0 w-full whitespace-normal break-words py-1.5 text-left font-['Inter',sans-serif] text-[11px] leading-snug ${
                    sel ? "bg-[#3c3c3c] text-[#e8e8e8]" : "text-[#c0c0c0] hover:bg-[#333333]"
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

      {/* Preview image / loading skeleton */}
      <div className="absolute h-[162px] left-[289px] top-[63px] w-[309px]" data-name="Script Image">
        {tab === "scriptblox" && scriptbloxLoading ? (
          <div className="flex h-full w-full animate-pulse items-center justify-center bg-[#1d1d1d]">
            <Loader2 className="h-5 w-5 animate-spin text-[#a3a3a3]" />
          </div>
        ) : (
          <img
            alt=""
            className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
            src={previewImage}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = scriptPreviewFallback;
            }}
          />
        )}
      </div>

      {/* Description panel */}
      <div
        className="absolute left-[289px] top-[225px] box-border flex h-[113px] w-[309px] flex-col bg-[#282827] px-2 py-2"
      >
        <p className="m-0 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words font-['Inter:Regular',sans-serif] text-[14px] font-normal leading-snug text-[#c0c0c0]">
          {previewDescription}
        </p>
        {runErr ? (
          <p className="mt-1 shrink-0 text-[11px] text-[#cc6e6e]">{runErr}</p>
        ) : null}
      </div>

      {/* Run Script */}
      <div className="absolute contents left-[289px] top-[341px]" data-name="Run Script Button">
        <button
          type="button"
          className="absolute left-[289px] top-[341px] z-[2] h-[36.81px] w-[153px] cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
          aria-label="Run Script"
          onClick={() => void onRun()}
          disabled={!selected || running}
        />
        <div className="pointer-events-none absolute bg-[#272727] border border-[#2d2d2d] border-solid h-[36.81px] left-[289px] top-[341px] w-[153px]" />
        <p className="pointer-events-none absolute font-['Inter:Regular',sans-serif] font-normal h-[17px] leading-[normal] left-[330px] not-italic text-[14px] text-white top-[350px] w-[70px]">
          {running ? "Running…" : "Run Script"}
        </p>
      </div>

      {/* Close */}
      <div className="absolute contents left-[445px] top-[341px]" data-name="Close Button">
        <button
          type="button"
          className="absolute left-[445px] top-[341px] z-[2] h-[36.81px] w-[153px] cursor-pointer border-0 bg-transparent p-0"
          onClick={() => void getCurrentWindow().close()}
          aria-label="Close"
        />
        <div className="pointer-events-none absolute bg-[#272727] border border-[#2d2d2d] border-solid h-[36.81px] left-[445px] top-[341px] w-[153px]" />
        <p className="pointer-events-none absolute font-['Inter:Regular',sans-serif] font-normal h-[17px] leading-[normal] left-[501px] not-italic text-[14px] text-white top-[350px] w-[40px]">
          Close
        </p>
      </div>

      {/* Top bar */}
      <div
        className="absolute z-[50] h-[58px] left-0 top-0 w-[612px]"
        style={{ backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-name="Top Bar"
        data-tauri-drag-region
      />
      <div
        className="absolute z-[50] flex h-[26px] left-[6px] top-[16px] w-[126px] items-center justify-start overflow-hidden"
        style={{ backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-name="Synapse Logo"
        data-tauri-drag-region
      >
        <img
          alt=""
          className="pointer-events-none max-h-full max-w-full object-contain object-left"
          src={ogTheme.logoDataUrl ?? synapseLogo}
        />
      </div>
    </div>
  );
}
