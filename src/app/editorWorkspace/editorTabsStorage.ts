import type { ScriptTab } from "./editorWorkspaceTypes";
import { EDITOR_TABS_STORAGE_KEY, newTabId } from "./editorWorkspaceTypes";

export type StoredEditorTabs = {
  tabs: ScriptTab[];
  activeTabId: string;
};

function isScriptTab(o: unknown): o is ScriptTab {
  if (!o || typeof o !== "object") return false;
  const t = o as Record<string, unknown>;
  if (t.diskPath !== undefined && typeof t.diskPath !== "string") return false;
  if (t.remoteUrl !== undefined && typeof t.remoteUrl !== "string") return false;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.content === "string"
  );
}

export function readStoredEditorTabs(): StoredEditorTabs | null {
  try {
    const raw = localStorage.getItem(EDITOR_TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (!Array.isArray(o.tabs) || typeof o.activeTabId !== "string") return null;
    const tabs = o.tabs.filter(isScriptTab);
    if (tabs.length === 0) return null;
    const active = tabs.some((t) => t.id === o.activeTabId) ? o.activeTabId : tabs[0]!.id;
    return { tabs, activeTabId: active };
  } catch {
    return null;
  }
}

export function defaultEditorTabs(): StoredEditorTabs {
  const id = newTabId();
  return { tabs: [{ id, title: "Script", content: "" }], activeTabId: id };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistEditorTabs(data: StoredEditorTabs, delayMs = 1200): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(EDITOR_TABS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  }, delayMs);
}
