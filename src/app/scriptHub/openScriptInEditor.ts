import type { NavigateFunction } from "react-router";

export interface ScriptHubOpenState {
  scriptHubOpen: {
    title: string;
    content: string;
    /** Dedupes React Strict Mode double effects. */
    openId: string;
  };
}

/** Survives route transitions if `location.state` is not applied to the index route (e.g. timing + layout animation). */
export const EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY = "synapseOriginal.editorScriptHubHandoff";
const LEGACY_EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY = "cosmic.editorScriptHubHandoff";

function safeHandoffTitle(title: unknown): string {
  if (typeof title === "string") return title;
  return String(title ?? "Script");
}

function safeHandoffContent(content: unknown): string {
  if (typeof content === "string") return content;
  return String(content ?? "");
}

/**
 * Preferred path from Script Hub routes: merge into `EditorWorkspace` (provider wraps the shell outlet),
 * clear stale session handoff, then navigate to `/`. Avoids relying on `location.state` reaching the lazy index route.
 */
export function openScriptInEditorAndGoHome(
  navigate: NavigateFunction,
  openScriptInEditor: (title: string, content: string) => string,
  title: string,
  content: string,
): void {
  openScriptInEditor(safeHandoffTitle(title), safeHandoffContent(content));
  clearScriptHubHandoffStorage();
  navigate("/", { replace: false });
}

/** Read handoff from router state and/or session backup; does not clear storage. */
export function peekScriptHubHandoff(locationState: unknown): ScriptHubOpenState["scriptHubOpen"] | null {
  const st = locationState as ScriptHubOpenState | null | undefined;
  const fromState = st?.scriptHubOpen;
  if (fromState?.openId) {
    return {
      openId: fromState.openId,
      title: safeHandoffTitle(fromState.title),
      content: safeHandoffContent(fromState.content),
    };
  }
  try {
    const raw =
      sessionStorage.getItem(EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY) ??
      sessionStorage.getItem(LEGACY_EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScriptHubOpenState["scriptHubOpen"];
    if (!parsed?.openId) return null;
    return {
      openId: parsed.openId,
      title: safeHandoffTitle(parsed.title),
      content: safeHandoffContent(parsed.content),
    };
  } catch {
    return null;
  }
}

export function clearScriptHubHandoffStorage(): void {
  try {
    sessionStorage.removeItem(EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_EDITOR_SCRIPT_HUB_HANDOFF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
