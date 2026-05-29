export type WorkspaceScriptEntry = {
  /** Stable id (usually file name). */
  id: string;
  /** Human-readable label in the list. */
  title: string;
  fileName: string;
  content: string;
  /** Absolute disk path when loaded from Tauri. */
  diskPath?: string;
};
