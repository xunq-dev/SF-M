import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ShellFitLine } from "../components/ShellFitLine";
import { getEditorChromeNavButtonStyle } from "../scriptHub/editorChromeNavButtonStyle";
import { openScriptInEditorAndGoHome } from "../scriptHub/openScriptInEditor";
import { synapseLegacyScripts } from "../scriptHub/synapseLegacyScripts";
import { useEditorWorkspace } from "../editorWorkspace/EditorWorkspaceContext";
import { useShellChrome } from "../shellChromeContext";
import ScriptBloxPage from "./ScriptBloxPage";

export default function ScriptHubPage() {
  const navigate = useNavigate();
  const { openScriptInEditor } = useEditorWorkspace();
  const { hasPageBackground, pageAreaBg, shellTheme } = useShellChrome();
  const sh = shellTheme.scriptHubTheme;
  const [showScriptBlox, setShowScriptBlox] = useState(false);
  const editorNavBtnStyle = useMemo(() => getEditorChromeNavButtonStyle(shellTheme), [shellTheme]);

  if (showScriptBlox) {
    return <ScriptBloxPage onBack={() => setShowScriptBlox(false)} />;
  }

  return (
    <div
      className="shell-script-browser-scroll relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto"
      style={{ backgroundColor: hasPageBackground ? "transparent" : pageAreaBg }}
    >
      <div className="relative flex min-h-[460px] w-full flex-col gap-3 px-2 pb-2 pt-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1 pr-1 font-normal" style={{ color: sh.titleColor }} data-shell-live="scriptHubTheme.titleColor">
            <ShellFitLine basePx={22} fitOptions={{ minPx: 7 }}>
              Scripts - Main Page
            </ShellFitLine>
          </div>
          <button
            type="button"
            onClick={() => setShowScriptBlox(true)}
            className="flex h-[36px] w-[125px] min-w-0 shrink-0 items-center justify-center border px-1"
            style={editorNavBtnStyle}
          >
            <ShellFitLine basePx={13} fitOptions={{ minPx: 6 }} className="font-normal">
              ScriptBlox Page
            </ShellFitLine>
          </button>
        </div>

        <p className="text-xs" style={{ color: sh.subtitleColor }} data-shell-live="scriptHubTheme.subtitleColor">
          Synapse legacy scripts — open in the editor to run or edit.
        </p>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {synapseLegacyScripts.map((s) => (
            <div
              key={s.name}
              className="flex min-h-[7rem] min-w-0 overflow-hidden border shadow-[0px_2px_8px_rgba(0,0,0,0.2)]"
              style={{
                borderRadius: sh.cardRadiusPx,
                borderColor: sh.cardBorderColor,
                backgroundColor: sh.cardBackground,
              }}
              data-shell-live="scriptHubTheme.cardBackground"
            >
              <div
                className="relative h-[7rem] w-1/3 min-w-[72px] shrink-0 overflow-hidden"
                style={{ backgroundColor: sh.thumbFallbackBg }}
                aria-hidden
              >
                <img
                  src={s.thumb}
                  alt=""
                  className="pointer-events-none absolute inset-0 z-0 block h-full w-full min-h-0 min-w-0 max-w-none object-cover"
                  style={{
                    objectFit: "cover",
                    objectPosition: "center top",
                  }}
                  draggable={false}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-2 break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]"
                    style={{ color: sh.titleColor }}
                    title={s.name}
                  >
                    {s.name}
                  </p>
                  <p
                    className="mt-0.5 line-clamp-3 break-words text-[11px] leading-snug [overflow-wrap:anywhere]"
                    style={{ color: sh.subtitleColor }}
                    title={s.desc}
                  >
                    {s.desc}
                  </p>
                </div>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white transition-colors"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: sh.ctaBorder,
                    backgroundColor: sh.ctaBackground,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = sh.ctaHoverBackground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = sh.ctaBackground;
                  }}
                  onClick={() => {
                    const content = `-- Synapse Legacy Script: ${s.name}\n${s.code}`;
                    openScriptInEditorAndGoHome(navigate, openScriptInEditor, s.name, content);
                  }}
                >
                  Open in editor
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
