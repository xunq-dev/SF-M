import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "../tauriEnv";
import type { WorkspaceScriptEntry } from "./workspaceScriptTypes";

export type RevealEditorSidebarResult = { ok: true } | { ok: false; message: string };

type ScriptListEntry = { name: string; path: string };

function isAutoexecuteScript(script: WorkspaceScriptEntry): boolean {
  return script.id.startsWith("autoexecute:");
}

function listEntryMatchesScript(entry: ScriptListEntry, script: WorkspaceScriptEntry): boolean {
  const nameMatch =
    entry.name.trim().toLowerCase() === script.fileName.trim().toLowerCase();
  if (!nameMatch) return false;

  if (isAutoexecuteScript(script)) {
    return script.id === `autoexecute:${entry.name}`;
  }
  return script.id === entry.name;
}

/** Resolve the authoritative disk path from the same list commands that populate the sidebar. */
async function resolveScriptPathFromSidebarList(
  script: WorkspaceScriptEntry,
): Promise<string | undefined> {
  const inAutoexecute = isAutoexecuteScript(script);
  const list = inAutoexecute
    ? await invoke<ScriptListEntry[]>("list_autoexecute_scripts")
    : await invoke<ScriptListEntry[]>("list_sidebar_scripts");

  const hit = list.find((e) => listEntryMatchesScript(e, script));
  return hit?.path?.trim();
}

async function revealPathInExplorer(path: string): Promise<RevealEditorSidebarResult> {
  try {
    await invoke("reveal_sidebar_script_path", { path });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

async function revealFailureMessage(script: WorkspaceScriptEntry): Promise<string> {
  let scriptsDir = "";
  try {
    scriptsDir = await invoke<string>("get_scripts_directory");
  } catch {
    /* ignore */
  }
  const folderHint = scriptsDir
    ? ` Look in: ${scriptsDir}${isAutoexecuteScript(script) ? "\\autoexecute" : ""}`
    : "";
  return `Could not find "${script.fileName}" on disk.${folderHint}`;
}

/** Reveal a sidebar script in the linked scripts / autoexecute folder (desktop only). */
export async function revealWorkspaceScriptInExplorer(
  script: WorkspaceScriptEntry,
): Promise<RevealEditorSidebarResult> {
  if (!isTauriApp()) {
    return { ok: false, message: "Open in file explorer is only available in the desktop app." };
  }

  try {
    const fromList = await resolveScriptPathFromSidebarList(script);
    if (fromList) {
      return revealPathInExplorer(fromList);
    }
  } catch (e) {
    console.warn("revealWorkspaceScriptInExplorer: sidebar list lookup failed", e);
  }

  const diskPath = script.diskPath?.trim();
  if (diskPath) {
    const res = await revealPathInExplorer(diskPath);
    if (res.ok) return res;
  }

  return { ok: false, message: await revealFailureMessage(script) };
}

/** Opens the system file manager for a sidebar script file name (desktop only). */
export async function revealEditorSidebarScriptInExplorer(
  fileName: string | undefined,
): Promise<RevealEditorSidebarResult> {
  const name = fileName?.trim();
  if (!name) {
    return { ok: false, message: "No file name for this script." };
  }
  if (!isTauriApp()) {
    return { ok: false, message: "Open in file explorer is only available in the desktop app." };
  }

  try {
    const list = await invoke<ScriptListEntry[]>("list_sidebar_scripts");
    const hit = list.find((e) => e.name.trim().toLowerCase() === name.toLowerCase());
    if (hit?.path) {
      return revealPathInExplorer(hit.path);
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }

  return { ok: false, message: await revealFailureMessage({ id: name, title: name, fileName: name, content: "" }) };
}
