import { SHELL_CUSTOM_EDITOR_THEME_ID, applyShellEditorBackground } from "@/editor/editorThemes";

export type LiveEditUiId = "v3" | "sx" | "og" | "shell";

const EDITOR_BG_PATHS: Record<LiveEditUiId, string | null> = {
  v3: "editor.workAreaBg",
  sx: "editorBg",
  og: "editorBg",
  shell: "surfaceElementsTheme.editorWorkAreaBackground",
};

/** After a live-edit color commit, apply Monaco canvas repaint when editor bg changed. */
export async function afterLiveEditPatch(
  path: string,
  hex: string,
  ui: LiveEditUiId,
): Promise<void> {
  const editorPath = EDITOR_BG_PATHS[ui];
  if (editorPath == null || path !== editorPath) return;
  await applyShellEditorBackground(hex, SHELL_CUSTOM_EDITOR_THEME_ID);
}
