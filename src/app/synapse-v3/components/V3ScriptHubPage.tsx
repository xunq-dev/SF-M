import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import { useEditorWorkspace } from "@/app/editorWorkspace/EditorWorkspaceContext";
import {
  fetchScriptBloxPage,
  fetchScriptBloxScriptBody,
  type ScriptBloxScript,
} from "@/app/scriptHub/scriptBloxApi";
import { synapseLegacyScripts, type SynapseLegacyScript } from "@/app/scriptHub/synapseLegacyScripts";
import { useV3Theme } from "../v3Theme";
import { v3ThemeInlineVars } from "../v3ThemeCss";
import type { V3Page } from "../v3PageTypes";
import { V3TopBar } from "./V3TopBar";
import { V3ScriptHubCard } from "./V3ScriptHubCard";
import { V3ScriptHubSourceToggle, type HubSource } from "./V3ScriptHubSourceToggle";

interface V3ScriptHubPageProps {
  currentPage: V3Page;
  onNavigate: (page: V3Page) => void;
}

async function resolveScriptBloxBody(script: ScriptBloxScript): Promise<string> {
  const inline = typeof script.script === "string" ? script.script.trim() : "";
  if (inline) return inline;
  if (script._id) return (await fetchScriptBloxScriptBody(script._id)).trim();
  return "";
}

export function V3ScriptHubPage({ currentPage, onNavigate }: V3ScriptHubPageProps) {
  const theme = useV3Theme();
  const themeVars = useMemo(() => v3ThemeInlineVars(theme), [theme]);
  const bridge = useExecutorBridge();
  const { openScriptInEditor } = useEditorWorkspace();
  const isAttached = bridge.connected;

  const [hubSource, setHubSource] = useState<HubSource>("scriptblox");
  const [hubSearch, setHubSearch] = useState("");
  const [hubPage, setHubPage] = useState(1);
  const [hubScripts, setHubScripts] = useState<ScriptBloxScript[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const load = useCallback(async (query: string, page: number) => {
    setIsLoading(true);
    setError(null);
    setHubPage(page);
    setRunMessage(null);
    try {
      const { scripts } = await fetchScriptBloxPage({ query, page });
      setHubScripts(scripts);
    } catch (e) {
      console.error(e);
      setHubScripts([]);
      setError("Could not reach ScriptBlox (network, CORS, or API error).");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", 1);
  }, [load]);

  const filteredScripts = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    if (!q) return hubScripts;
    return hubScripts.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.game?.name ?? "").toLowerCase().includes(q),
    );
  }, [hubSearch, hubScripts]);

  const statusLine =
    hubSource === "scriptblox" ? error ?? runMessage : runMessage;

  const handleHubSourceChange = useCallback((source: HubSource) => {
    setHubSource(source);
    setRunMessage(null);
    if (source === "synapse") setError(null);
  }, []);

  const handleExecute = useCallback(
    async (script: ScriptBloxScript) => {
      if (!isAttached || executingId) return;
      setExecutingId(script._id);
      setRunMessage(null);
      setError(null);
      try {
        const body = await resolveScriptBloxBody(script);
        if (!body.trim()) {
          setRunMessage("Empty script — nothing to run.");
          return;
        }
        const result = await bridge.execute(body);
        if (!result.ok) {
          setRunMessage(result.message);
        }
      } catch (e) {
        setRunMessage(e instanceof Error ? e.message : String(e));
      } finally {
        setExecutingId(null);
      }
    },
    [bridge, executingId, isAttached],
  );

  const handleOpenInEditor = useCallback(
    async (script: ScriptBloxScript) => {
      if (openingId) return;
      setOpeningId(script._id);
      const title = script.title?.trim() || "Script";
      try {
        let body = await resolveScriptBloxBody(script);
        if (!body) {
          body = `-- ScriptBlox: ${title}\n-- No source returned.\n`;
        }
        openScriptInEditor(title, body);
        onNavigate("editor");
      } catch (e) {
        openScriptInEditor(
          title,
          `-- ScriptBlox: ${title}\n-- Could not load script source (${e instanceof Error ? e.message : String(e)})\n`,
        );
        onNavigate("editor");
      } finally {
        setOpeningId(null);
      }
    },
    [openingId, openScriptInEditor, onNavigate],
  );

  const handleSynapseExecute = useCallback(
    async (script: SynapseLegacyScript) => {
      if (!isAttached || executingId) return;
      setExecutingId(script.name);
      setRunMessage(null);
      try {
        const body = script.code.trim();
        if (!body) {
          setRunMessage("Empty script — nothing to run.");
          return;
        }
        const result = await bridge.execute(body);
        if (!result.ok) {
          setRunMessage(result.message);
        }
      } catch (e) {
        setRunMessage(e instanceof Error ? e.message : String(e));
      } finally {
        setExecutingId(null);
      }
    },
    [bridge, executingId, isAttached],
  );

  const handleSynapseOpenInEditor = useCallback(
    (script: SynapseLegacyScript) => {
      if (openingId) return;
      setOpeningId(script.name);
      try {
        const content = `-- Synapse Legacy Script: ${script.name}\n${script.code}`;
        openScriptInEditor(script.name, content);
        onNavigate("editor");
      } finally {
        setOpeningId(null);
      }
    },
    [openingId, openScriptInEditor, onNavigate],
  );

  const viewOnScriptBlox = useCallback((script: ScriptBloxScript) => {
    const id = script._id?.trim();
    if (!id) return;
    window.open(`https://scriptblox.com/script/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="size-full relative" style={themeVars}>
      <V3TopBar currentPage={currentPage} onNavigate={onNavigate} />

      <div
        className="absolute left-0 right-0 bottom-0 flex min-h-0 flex-col"
        data-v3-live="shell.pageBg"
        style={{
          top: 44,
          background: "var(--v3-shell-page-bg, #151515)",
          borderBottomRightRadius: 7,
        }}
      >
        <div className="shrink-0 px-4 pt-2.5 pb-2">
          <V3ScriptHubSourceToggle
            value={hubSource}
            onChange={handleHubSourceChange}
            theme={theme}
          />

          {hubSource === "scriptblox" && (
            <div
              className="relative mt-2 rounded-md border border-solid"
              data-v3-live="scriptHub.searchBorder"
              style={{ borderColor: "var(--v3-scripthub-search-border, rgba(255,255,255,0.1))" }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: "var(--v3-scripthub-toggle-inactive-text, #868686)" }}
                aria-hidden
              />
              <input
                type="search"
                value={hubSearch}
                onChange={(e) => setHubSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load(hubSearch, 1);
                }}
                placeholder="Search ScriptBlox scripts…"
                aria-label="Search ScriptBlox"
                className="w-full rounded-md border-0 py-2.5 pl-9 pr-9 text-[12px] outline-none focus:ring-1 focus:ring-white/20"
                data-v3-live="scriptHub.searchBg"
                style={{
                  fontFamily: "Inter, sans-serif",
                  background: "var(--v3-scripthub-search-bg, #2a2a2a)",
                  color: "var(--v3-scripthub-search-text, #f6f6f5)",
                }}
              />
              {isLoading && (
                <Loader2
                  className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin"
                  style={{ color: "var(--v3-accent-primary, #5ee85e)" }}
                  aria-hidden
                />
              )}
            </div>
          )}

          {statusLine && (
            <p
              className="mt-1.5 truncate px-0.5 text-[11px] leading-snug"
              style={{
                color:
                  hubSource === "scriptblox" && error
                    ? "var(--v3-scripthub-error-text, #cc6e6e)"
                    : "var(--v3-scripthub-status-text, #868686)",
                fontFamily: "Inter, sans-serif",
              }}
              title={statusLine}
            >
              {statusLine}
            </p>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#444 transparent" }}
        >
          {hubSource === "scriptblox" &&
            !isLoading &&
            filteredScripts.length === 0 &&
            !error && (
              <p
                className="py-12 text-center text-[12px]"
                style={{
                  color: "var(--v3-scripthub-status-text, #868686)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {hubSearch.trim() ? "No scripts match your search." : "No scripts on this page."}
              </p>
            )}

          <div className="grid min-w-0 grid-cols-3 gap-3">
            {hubSource === "scriptblox"
              ? filteredScripts.map((script) => (
                  <V3ScriptHubCard
                    key={script._id}
                    source="scriptblox"
                    script={script}
                    bridgeConnected={isAttached}
                    executing={executingId === script._id}
                    opening={openingId === script._id}
                    onExecute={() => void handleExecute(script)}
                    onOpenInEditor={() => void handleOpenInEditor(script)}
                    onViewOnScriptBlox={() => viewOnScriptBlox(script)}
                  />
                ))
              : synapseLegacyScripts.map((script) => (
                  <V3ScriptHubCard
                    key={script.name}
                    source="synapse"
                    script={script}
                    bridgeConnected={isAttached}
                    executing={executingId === script.name}
                    opening={openingId === script.name}
                    onExecute={() => void handleSynapseExecute(script)}
                    onOpenInEditor={() => handleSynapseOpenInEditor(script)}
                  />
                ))}
          </div>
        </div>

        {hubSource === "scriptblox" && (
          <div className="flex shrink-0 items-center justify-center gap-4 py-2">
            <button
              type="button"
              disabled={hubPage <= 1 || isLoading}
              onClick={() => {
                if (hubPage > 1) void load(hubSearch, hubPage - 1);
              }}
              className="text-[11px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-scripthub-pagination-text, #868686)",
              }}
            >
              Previous
            </button>
            <span
              className="text-[11px] tabular-nums"
              style={{
                color: "var(--v3-scripthub-pagination-text, #868686)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Page {hubPage}
            </span>
            <button
              type="button"
              disabled={hubScripts.length < 20 || isLoading}
              onClick={() => void load(hubSearch, hubPage + 1)}
              className="text-[11px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-scripthub-pagination-text, #868686)",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
