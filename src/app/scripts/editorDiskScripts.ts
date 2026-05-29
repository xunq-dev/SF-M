import { invoke } from "@tauri-apps/api/core";
import { basename, join, resourceDir } from "@tauri-apps/api/path";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { TAB_TITLE_MAX_LEN } from "../editorWorkspace/editorWorkspaceTypes";
import { isTauriApp } from "../tauriEnv";

const LUA_FILTERS = [{ name: "Lua", extensions: ["lua"] }];

export async function scriptTabTitleFromPath(path: string): Promise<string> {
  const base = await basename(path);
  const t = titleFromFileName(base);
  return t.slice(0, TAB_TITLE_MAX_LEN);
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.lua$/i, "");
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function sanitizeScriptFileBaseName(name: string): string {
  const t = name.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_").trim();
  return t.slice(0, 80) || "script";
}

/** Bundled `resources/scripthub` folder (linked workspace scripts). */
export async function getLinkedScriptsDirectoryPath(): Promise<string> {
  return join(await resourceDir(), "scripthub");
}

async function readTextFileAbs(path: string): Promise<string> {
  return invoke<string>("read_text_file_abs", { path });
}

async function writeTextFileAbs(path: string, contents: string): Promise<void> {
  await invoke("write_text_file_abs", { path, contents });
}

export type PickedScriptFile = {
  /** Absolute path in Tauri; basename-only in the browser. */
  path: string;
  content: string;
  /** Display title derived from file name. */
  title: string;
};

/**
 * Open picker (defaults to linked `resources/scripts`) and read the file.
 * In the browser, uses a file input (no real path).
 */
export async function pickAndReadScriptFile(): Promise<PickedScriptFile | null> {
  if (!isTauriApp()) {
    return pickAndReadScriptFileWeb();
  }
  const defaultPath = await getLinkedScriptsDirectoryPath();
  const selected = await openDialog({
    multiple: false,
    directory: false,
    defaultPath,
    filters: LUA_FILTERS,
    title: "Open script",
  });
  if (selected === null) return null;
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (!path) return null;
  const content = await readTextFileAbs(path);
  const base = await basename(path);
  const title = titleFromFileName(base);
  return { path, content, title };
}

function pickAndReadScriptFileWeb(): Promise<PickedScriptFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".lua,.txt,text/plain";
    input.onchange = () => {
      void (async () => {
        const f = input.files?.[0];
        if (!f) {
          resolve(null);
          return;
        }
        try {
          const content = await f.text();
          const base = f.name || "script.lua";
          resolve({
            path: base,
            content,
            title: titleFromFileName(base),
          });
        } catch {
          resolve(null);
        }
      })();
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Save dialog defaulting to linked scripts folder; returns absolute path or null.
 */
export async function pickSaveScriptPath(suggestedTitle: string): Promise<string | null> {
  if (!isTauriApp()) return null;
  const base = sanitizeScriptFileBaseName(suggestedTitle);
  const scriptsDir = await getScriptsDirectoryPath();
  const defaultPath = scriptsDir
    ? await join(scriptsDir, `${base}.lua`)
    : await join(await getLinkedScriptsDirectoryPath(), `${base}.lua`);
  return saveDialog({
    defaultPath,
    filters: LUA_FILTERS,
    title: "Save script",
  });
}

/** Write script bytes to path (Tauri). */
export async function saveScriptToPath(path: string, content: string): Promise<void> {
  if (!isTauriApp()) {
    throw new Error("saveScriptToPath requires the desktop app.");
  }
  await writeTextFileAbs(path, content);
}

/** Browser: trigger download of a .lua file. */
export function downloadScriptAsFile(suggestedTitle: string, content: string): void {
  const name = `${sanitizeScriptFileBaseName(suggestedTitle)}.lua`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Desktop scripts folder (`resources/scripts` or app config fallback). */
export async function getScriptsDirectoryPath(): Promise<string | null> {
  if (!isTauriApp()) return null;
  try {
    return await invoke<string>("get_scripts_directory");
  } catch {
    return null;
  }
}

/** `{scripts}/autoexecute` — created on first use by the Rust backend. */
export async function getAutoexecuteDirectoryPath(): Promise<string | null> {
  const scriptsDir = await getScriptsDirectoryPath();
  if (!scriptsDir) return null;
  return join(scriptsDir, "autoexecute");
}

export async function moveScriptBetweenFolders(fromPath: string, toPath: string): Promise<void> {
  if (!isTauriApp()) {
    throw new Error("moveScriptBetweenFolders requires the desktop app.");
  }
  await invoke("move_script_file", { from: fromPath, to: toPath });
}

/** Write a script into the autoexecute folder; returns the absolute path. */
export async function saveTabToAutoexecute(fileName: string, content: string): Promise<string> {
  const dir = await getAutoexecuteDirectoryPath();
  if (!dir) throw new Error("Autoexecute folder is unavailable.");
  const normalized = fileName.endsWith(".lua") ? fileName : `${fileName}.lua`;
  const path = await join(dir, normalized);
  await saveScriptToPath(path, content);
  return path;
}
