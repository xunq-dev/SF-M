import { invoke } from "@tauri-apps/api/core";
import type { ScriptTab } from "@/app/editorWorkspace/editorWorkspaceTypes";
import type { WorkspaceScriptEntry } from "./workspaceScriptTypes";
import { saveScriptToPath } from "./editorDiskScripts";
import { isTauriApp } from "../tauriEnv";

function normalizeContent(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function tabContentMatchesDisk(tabContent: string, diskContent: string): boolean {
  return normalizeContent(tabContent) === normalizeContent(diskContent);
}

/** Normalize tab/script labels for fuzzy title matching (handles `.lua`, hyphens, spaces). */
function normalizeScriptTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\.lua$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.lua$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fileNameMatchesTabTitle(fileName: string, tabTitle: string): boolean {
  const tab = tabTitle.trim().toLowerCase();
  const file = fileName.trim().toLowerCase();
  if (!tab || !file) return false;
  if (tab === file) return true;
  const tabBase = tab.replace(/\.lua$/i, "");
  const fileBase = file.replace(/\.lua$/i, "");
  return tabBase === fileBase;
}

function scriptMatchesTabTitle(script: WorkspaceScriptEntry, tabTitle: string): boolean {
  const norm = normalizeScriptTitle(tabTitle);
  if (!norm) return false;
  if (normalizeScriptTitle(script.title) === norm) return true;
  if (normalizeScriptTitle(titleFromFileName(script.fileName)) === norm) return true;
  if (normalizeScriptTitle(script.fileName) === norm) return true;
  if (fileNameMatchesTabTitle(script.fileName, tabTitle)) return true;
  return false;
}

function pickBestTitleMatch(
  tab: ScriptTab,
  matches: WorkspaceScriptEntry[],
): WorkspaceScriptEntry | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  const contentHits = matches.filter((s) => tabContentMatchesDisk(tab.content, s.content));
  if (contentHits.length === 1) return contentHits[0];

  const fileNameHit = matches.find((s) => fileNameMatchesTabTitle(s.fileName, tab.title));
  if (fileNameHit) return fileNameHit;

  const autoexecuteHit = matches.find((s) => s.id.startsWith("autoexecute:"));
  const scriptsHit = matches.find((s) => !s.id.startsWith("autoexecute:"));
  if (autoexecuteHit && scriptsHit) {
    const autoContent = tabContentMatchesDisk(tab.content, autoexecuteHit.content);
    const scriptsContent = tabContentMatchesDisk(tab.content, scriptsHit.content);
    if (autoContent && !scriptsContent) return autoexecuteHit;
    if (scriptsContent && !autoContent) return scriptsHit;
  }

  return matches[0];
}

/** Find a sidebar script path for a tab opened without diskPath (match by title and/or content). */
export function resolveTabDiskPathFromScripts(
  tab: ScriptTab,
  scripts: WorkspaceScriptEntry[],
  autoexecuteScripts: WorkspaceScriptEntry[],
): string | undefined {
  if (tab.diskPath) return tab.diskPath;

  const pool = [...scripts, ...autoexecuteScripts].filter((s) => s.diskPath);

  const titleMatches = pool.filter((s) => scriptMatchesTabTitle(s, tab.title));
  const titlePick = pickBestTitleMatch(tab, titleMatches);
  if (titlePick?.diskPath) return titlePick.diskPath;

  const contentMatch = pool.find((s) => tabContentMatchesDisk(tab.content, s.content));
  return contentMatch?.diskPath;
}

export type OpenTabLocationActions = {
  saveTabToFile: (tabId: string) => Promise<string | null>;
  bindTabDiskPath: (tabId: string, diskPath: string) => void;
};

/**
 * Reveal tab on disk when unchanged; save first when dirty or untied.
 * Returns the path revealed, or null if cancelled/failed.
 */
export async function openTabLocation(
  tab: ScriptTab,
  scripts: WorkspaceScriptEntry[],
  autoexecuteScripts: WorkspaceScriptEntry[],
  actions: OpenTabLocationActions,
): Promise<string | null> {
  if (!isTauriApp()) return null;

  let path = resolveTabDiskPathFromScripts(tab, scripts, autoexecuteScripts);

  if (path && !tab.diskPath) {
    actions.bindTabDiskPath(tab.id, path);
  }

  if (!path) {
    path = (await actions.saveTabToFile(tab.id)) ?? undefined;
    if (!path) return null;
    await invoke("reveal_in_file_manager", { path });
    return path;
  }

  const diskContent = await invoke<string>("read_text_file_abs", { path });

  if (tabContentMatchesDisk(tab.content, diskContent)) {
    await invoke("reveal_in_file_manager", { path });
    return path;
  }

  await saveScriptToPath(path, tab.content);
  actions.bindTabDiskPath(tab.id, path);
  await invoke("reveal_in_file_manager", { path });
  return path;
}
