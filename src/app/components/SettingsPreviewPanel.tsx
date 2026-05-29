import { useEffect, useState } from "react";
import { readShellTheme, SHELL_THEME_CHANGED_EVENT } from "@/ui/shellTheme";
import InitScreenThemePreview from "./InitScreenThemePreview";
import ScriptMonacoEditor from "@/editor/ScriptMonacoEditor";
import { readStoredEditorThemeId, EDITOR_THEME_CHANGED_EVENT } from "@/editor/editorThemes";
import SynapseOriginalMainPreview from "./SynapseOriginalMainPreview";
import SynapseXMainPreview from "./SynapseXMainPreview";

/**
 * A side panel for Settings pages (OG/X) that shows live previews of the
 * Loading Screen and a dummy Editor, allowing users to see theme changes
 * without leaving the settings window.
 */
export default function SettingsPreviewPanel({
  visible,
  className = "",
  shell = "default",
}: {
  visible: boolean;
  className?: string;
  shell?: "default" | "synapseOriginal" | "synapseX";
}) {
  const [theme, setTheme] = useState(readShellTheme);
  const [editorThemeId, setEditorThemeId] = useState(readStoredEditorThemeId);

  useEffect(() => {
    const sync = () => {
      setTheme(readShellTheme());
      setEditorThemeId(readStoredEditorThemeId());
    };
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
      window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`flex flex-col gap-4 border-l border-white/10 bg-black/20 p-4 backdrop-blur-md ${className}`}
      style={{ width: 300 }}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
          Loading Screen Preview
        </h3>
        <div className="overflow-hidden rounded-sm border border-white/5 shadow-lg">
          <InitScreenThemePreview shell={shell} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
          {shell === "default" ? "Editor Theme Preview" : "Main UI Preview"}
        </h3>
        <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-white/5 shadow-lg bg-[#1e1e1e]">
          {shell === "synapseOriginal" ? (
            <SynapseOriginalMainPreview />
          ) : shell === "synapseX" ? (
            <SynapseXMainPreview />
          ) : (
            <ScriptMonacoEditor
              readOnly
              themeId={editorThemeId}
              value={`-- Previewing your editor theme\nfunction hello_world()\n  print("Hello from Synapse!")\nend\n\nhello_world()`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
