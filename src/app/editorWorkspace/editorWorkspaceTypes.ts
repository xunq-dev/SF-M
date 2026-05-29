export type ScriptTab = {
  id: string;
  title: string;
  content: string;
  /** Absolute path when tied to a file on disk (Tauri). */
  diskPath?: string;
  /** Raw URL when opened from GitHub Gists sidebar (re-fetched on refresh/open). */
  remoteUrl?: string;
};

export const TAB_TITLE_MAX_LEN = 80;

export const EDITOR_TABS_STORAGE_KEY = "synapse.editorTabs.v1";

export function newTabId(): string {
  return `tab_${Math.random().toString(36).slice(2, 12)}`;
}
