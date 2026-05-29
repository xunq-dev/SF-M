import type * as monaco from "monaco-editor";
import themeListJson from "../../node_modules/monaco-themes/themes/themelist.json";
import tomorrowNightEightiesCustom from "./tomorrow-night-eighties.theme.json";
import { KRNL_DARK_THEME, KRNL_LIGHT_THEME } from "./monaluauThemes";

/**
 * Synapse’s WPF host only calls `SetTheme("Dark"|"Light")` (see `Synapse UI WPF/Controls/Monaco.cs`);
 * the full editor theme list ships inside downloaded `bin/Monaco.zip` (same TM JSON set as the
 * `monaco-themes` npm package). We load every JSON from that package here.
 */
const THEME_LIST = themeListJson as Record<string, string>;

function normalizeStem(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolvePackThemeId(fileBase: string): string | null {
  if (fileBase === "themelist") return null;
  for (const [id, label] of Object.entries(THEME_LIST)) {
    if (label === fileBase) return id;
    if (normalizeStem(label) === normalizeStem(fileBase)) return id;
  }
  return null;
}

function fallbackIdFromFileBase(fileBase: string): string {
  return fileBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelForId(id: string, fileBase: string): string {
  const fromList = THEME_LIST[id];
  if (fromList) return fromList;
  return fileBase;
}

const packGlob = import.meta.glob("../../node_modules/monaco-themes/themes/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export type PackThemeEntry = { id: string; label: string; pathKey: string };

function buildPackThemeEntries(): PackThemeEntry[] {
  const out: PackThemeEntry[] = [];
  for (const pathKey of Object.keys(packGlob)) {
    const fileName = pathKey.split("/").pop() ?? "";
    const fileBase = fileName.replace(/\.json$/i, "");
    if (fileBase === "themelist") continue;
    const resolved = resolvePackThemeId(fileBase);
    const id = resolved ?? fallbackIdFromFileBase(fileBase);
    out.push({ id, label: labelForId(id, fileBase), pathKey });
  }
  const byId = new Map<string, PackThemeEntry>();
  for (const e of out) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }

  // Add Krnl themes manually
  byId.set("krnl-dark", { id: "krnl-dark", label: "Krnl Dark", pathKey: "krnl-dark" });
  byId.set("krnl-light", { id: "krnl-light", label: "Krnl Light", pathKey: "krnl-light" });

  return [...byId.values()];
}

export const PACK_THEME_ENTRIES: PackThemeEntry[] = buildPackThemeEntries();

export const PACK_THEME_IDS: ReadonlySet<string> = new Set(PACK_THEME_ENTRIES.map((e) => e.id));

let packRegistered = false;

export function registerPackMonacoThemes(m: typeof import("monaco-editor")): void {
  if (packRegistered) return;
  packRegistered = true;
  for (const { id, pathKey } of PACK_THEME_ENTRIES) {
    const raw = packGlob[pathKey];
    const data =
      id === "tomorrow-night-eighties"
        ? tomorrowNightEightiesCustom
        : id === "krnl-dark"
          ? KRNL_DARK_THEME
          : id === "krnl-light"
            ? KRNL_LIGHT_THEME
            : (raw as monaco.editor.IStandaloneThemeData);
    if (!data || typeof data !== "object") continue;
    try {
      m.editor.defineTheme(id, data as monaco.editor.IStandaloneThemeData);
    } catch {
      /* skip malformed pack themes */
    }
  }
}
