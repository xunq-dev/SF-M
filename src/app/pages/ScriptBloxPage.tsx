import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ShellFitLine } from "../components/ShellFitLine";
import { openScriptInEditorAndGoHome } from "../scriptHub/openScriptInEditor";
import { ScriptHubCardThumb } from "../scriptHub/ScriptHubCardThumb";
import {
  fetchScriptBloxPage,
  fetchScriptBloxScriptBody,
  scriptBloxCardImageUrl,
  type ScriptBloxScript,
} from "../scriptHub/scriptBloxApi";
import { getEditorChromeNavButtonStyle } from "../scriptHub/editorChromeNavButtonStyle";
import { useShellChrome } from "../shellChromeContext";
import { useEditorWorkspace } from "../editorWorkspace/EditorWorkspaceContext";

interface ScriptBloxPageProps {
  onBack: () => void;
}

export default function ScriptBloxPage({ onBack }: ScriptBloxPageProps) {
  const navigate = useNavigate();
  const { openScriptInEditor } = useEditorWorkspace();
  const { hasPageBackground, pageAreaBg, shellTheme } = useShellChrome();
  const editorNavBtnStyle = useMemo(() => getEditorChromeNavButtonStyle(shellTheme), [shellTheme]);
  const sh = shellTheme.scriptHubTheme;
  const [hubSearch, setHubSearch] = useState("");
  const [hubPage, setHubPage] = useState(1);
  const [hubScripts, setHubScripts] = useState<ScriptBloxScript[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async (query: string, page: number) => {
    setIsLoading(true);
    setError(null);
    setHubPage(page);
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

  return (
    <div
      className="shell-script-browser-scroll relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto"
      style={{ backgroundColor: hasPageBackground ? "transparent" : pageAreaBg }}
    >
      <div className="relative flex min-h-[460px] w-full flex-col gap-3 px-2 pb-2 pt-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 flex-1 font-normal pr-1" style={{ color: sh.titleColor }}>
            <ShellFitLine basePx={22} fitOptions={{ minPx: 6 }}>
              ScriptBlox - Community Scripts
            </ShellFitLine>
          </p>
          <button
            type="button"
            onClick={onBack}
            className="flex h-[36px] w-[125px] min-w-0 shrink-0 items-center justify-center border px-1"
            style={editorNavBtnStyle}
          >
            <ShellFitLine basePx={13} fitOptions={{ minPx: 6 }} className="font-normal">
              Back to Main
            </ShellFitLine>
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: sh.subtitleColor }}
          />
          <input
            type="search"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(hubSearch, 1);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search thousands of scripts..."
            className="w-full rounded py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#6a6a6e] outline-none"
            style={{
              backgroundColor: sh.searchBackground,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: searchFocused ? sh.searchFocusBorder : sh.searchBorder,
            }}
            aria-label="Search ScriptBlox"
          />
          {isLoading && (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
              style={{ color: sh.searchFocusBorder }}
            />
          )}
        </div>

        {error && (
          <p
            className="rounded border px-2 py-1.5 text-xs"
            style={{
              borderColor: sh.cardBorderColor,
              backgroundColor: sh.cardBackground,
              color: sh.subtitleColor,
            }}
          >
            {error}
          </p>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {hubScripts.map((script) => (
            <div
              key={script._id}
              className="flex min-h-[7rem] min-w-0 overflow-hidden border shadow-[0px_2px_8px_rgba(0,0,0,0.2)]"
              style={{
                borderRadius: sh.cardRadiusPx,
                borderColor: sh.cardBorderColor,
                backgroundColor: sh.cardBackground,
              }}
            >
              <div className="w-1/3 min-w-[72px] flex-shrink-0 self-stretch overflow-hidden">
                <ScriptHubCardThumb
                  src={scriptBloxCardImageUrl(script)}
                  fallbackBg={sh.thumbFallbackBg}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-2 break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]"
                    style={{ color: sh.titleColor }}
                    title={script.title}
                  >
                    {script.title}
                  </p>
                  <p
                    className="mt-0.5 line-clamp-2 break-words text-[10px] font-medium uppercase leading-snug tracking-wider [overflow-wrap:anywhere]"
                    style={{ color: sh.subtitleColor }}
                    title={script.game?.name ?? "Global Script"}
                  >
                    {script.game?.name ?? "Global Script"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={openingId === script._id}
                  className="w-full rounded px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: sh.ctaBorder,
                    backgroundColor: sh.ctaBackground,
                  }}
                  onMouseEnter={(e) => {
                    if (openingId === script._id) return;
                    e.currentTarget.style.backgroundColor = sh.ctaHoverBackground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = sh.ctaBackground;
                  }}
                  onClick={() => {
                    void (async () => {
                      setOpeningId(script._id);
                      try {
                        let body =
                          typeof script.script === "string" ? script.script.trim() : "";
                        if (!body && script._id) {
                          body = (await fetchScriptBloxScriptBody(script._id)).trim();
                        }
                        const title =
                          typeof script.title === "string" ? script.title.trim() || "Script" : "Script";
                        const content =
                          body ||
                          `-- ScriptBlox: ${title}\n-- No source returned; open the script page in a browser.\n`;
                        openScriptInEditorAndGoHome(navigate, openScriptInEditor, title, content);
                      } catch (e) {
                        console.error(e);
                        const title =
                          typeof script.title === "string" ? script.title.trim() || "Script" : "Script";
                        openScriptInEditorAndGoHome(
                          navigate,
                          openScriptInEditor,
                          title,
                          `-- ScriptBlox: ${title}\n-- Could not load script source (${e instanceof Error ? e.message : String(e)})\n`,
                        );
                      } finally {
                        setOpeningId(null);
                      }
                    })();
                  }}
                >
                  {openingId === script._id ? "Loading…" : "Open in editor"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && hubScripts.length === 0 && !error && (
          <p className="py-6 text-center text-sm" style={{ color: sh.subtitleColor }}>
            No scripts on this page.
          </p>
        )}

        <div
          className="mt-1 flex flex-wrap items-center justify-center gap-3 border-t pt-3"
          style={{ borderColor: `${sh.cardBorderColor}99` }}
        >
          <button
            type="button"
            disabled={hubPage <= 1 || isLoading}
            className="rounded border px-4 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-45"
            style={editorNavBtnStyle}
            onClick={() => {
              if (hubPage > 1) void load(hubSearch, hubPage - 1);
            }}
          >
            Previous
          </button>
          <span className="text-sm font-semibold" style={{ color: sh.subtitleColor }}>
            Page {hubPage}
          </span>
          <button
            type="button"
            disabled={hubScripts.length < 20 || isLoading}
            className="rounded border px-4 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-45"
            style={editorNavBtnStyle}
            onClick={() => void load(hubSearch, hubPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
