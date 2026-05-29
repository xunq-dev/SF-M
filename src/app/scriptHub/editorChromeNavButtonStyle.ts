import type { CSSProperties } from "react";
import type { ShellThemeState } from "@/ui/shellTheme";

/** Same gradient/border/text as the editor bottom bar (Execute, Clear, …). */
export function getEditorChromeNavButtonStyle(theme: ShellThemeState): CSSProperties {
  return {
    borderColor: theme.editorControlBarBorder,
    color: theme.editorControlBarText,
    backgroundImage: `linear-gradient(to bottom, ${theme.editorControlBarButtonFrom}, ${theme.editorControlBarButtonTo})`,
    boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.09)",
  };
}
