import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "../tauriEnv";
import type { WorkspaceScriptEntry } from "./workspaceScriptTypes";

/**
 * Service for managing the editor's sidebar script list.
 * Loads .lua files from the 'resources/scripts' folder.
 */
const globModules = import.meta.glob<string>("../../assets/scripts/*.lua", {
  eager: true,
  import: "default",
  query: "?raw",
});

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.lua$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function loadFromGlob(): WorkspaceScriptEntry[] {
  const out: WorkspaceScriptEntry[] = [];
  for (const path of Object.keys(globModules)) {
    const fileName = path.split(/[/\\]/).pop() ?? path;
    const raw = globModules[path];
    const content = typeof raw === "string" ? raw : String(raw);
    out.push({
      id: fileName,
      title: titleFromFileName(fileName),
      fileName,
      content,
    });
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

async function loadFromTauriCommand(): Promise<WorkspaceScriptEntry[] | null> {
  try {
    const list = await invoke<{ name: string; path: string }[]>("list_sidebar_scripts");
    const out: WorkspaceScriptEntry[] = [];
    for (const ent of list) {
      try {
        const content = await invoke<string>("read_text_file_abs", { path: ent.path });
        out.push({
          id: ent.name,
          title: titleFromFileName(ent.name),
          fileName: ent.name,
          content,
          diskPath: ent.path,
        });
      } catch (e) {
        console.warn(`Failed to read script content at ${ent.path}:`, e);
      }
    }
    return out;
  } catch (e) {
    console.warn("Failed to list sidebar scripts via command:", e);
    return null;
  }
}

async function loadAutoexecuteFromTauriCommand(): Promise<WorkspaceScriptEntry[]> {
  try {
    const list = await invoke<{ name: string; path: string }[]>("list_autoexecute_scripts");
    const out: WorkspaceScriptEntry[] = [];
    for (const ent of list) {
      try {
        const content = await invoke<string>("read_text_file_abs", { path: ent.path });
        out.push({
          id: `autoexecute:${ent.name}`,
          title: titleFromFileName(ent.name),
          fileName: ent.name,
          content,
          diskPath: ent.path,
        });
      } catch (e) {
        console.warn(`Failed to read autoexecute script at ${ent.path}:`, e);
      }
    }
    return out;
  } catch (e) {
    console.warn("Failed to list autoexecute scripts via command:", e);
    return [];
  }
}

/** Loads sidebar list: Tauri reads `resources/scripts`; web/dev uses Vite glob. */
export async function loadEditorSidebarScripts(): Promise<WorkspaceScriptEntry[]> {
  if (isTauriApp()) {
    try {
      const fromDisk = await loadFromTauriCommand();
      if (fromDisk !== null) return fromDisk;
    } catch (e) {
      console.warn("editor sidebar scripts: tauri command failed, using dev glob.", e);
    }
  }
  return loadFromGlob();
}

/** Loads `.lua` files from `{scripts}/autoexecute`. */
export async function loadAutoexecuteScripts(): Promise<WorkspaceScriptEntry[]> {
  if (isTauriApp()) {
    return loadAutoexecuteFromTauriCommand();
  }
  return [];
}
