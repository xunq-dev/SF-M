import { useEffect, useState } from "react";
import type { ScriptListThemeTokens } from "@/app/editor/script-list/ScriptListThemeTokens";

/** Synapse X shell appearance: universally-applied colours for every surface, an optional
 * overlay image (main window only), and an optional custom logo. Persisted in localStorage
 * and synced cross-window via storage events. Independent from the OG theme. */
export interface SynapseXTheme {
  /** Outer window fill (was hardcoded #333333). */
  windowBg: string;
  /** Top bars + side panels + button surfaces (was hardcoded #3C3C3C). */
  panelBg: string;
  /** Title-bar / banner / panel header text (was hardcoded #ffffff). */
  text: string;

  /* ── Buttons ─────────────────────────────────────────────── */
  buttonBg: string;
  buttonHoverBg: string;
  buttonActiveBg: string;
  buttonBorder: string;
  buttonText: string;

  /* ── Tabs ─────────────────────────────────────────────────── */
  tabBg: string;
  tabActiveBg: string;
  tabBorder: string;
  tabActiveBorder: string;
  tabText: string;

  /* ── Editor ──────────────────────────────────────────────── */
  editorBg: string;

  /* ── Script list ─────────────────────────────────────────── */
  listHoverBg: string;
  listText: string;
  scriptList: ScriptListThemeTokens;

  /* ── Icons ───────────────────────────────────────────────── */
  iconColor: string;

  /** Optional data URL for the overlay image; null when not customized. */
  overlayDataUrl: string | null;
  /** 0..1 opacity for the overlay layer. */
  overlayOpacity: number;
  /** Whether the overlay sits behind UI ("behind") or on top with pointer-events: none ("top") */
  overlayMode: "behind" | "top";

  /** Optional data URL for the custom logo; null falls back to bundled synapse-x logo. */
  logoDataUrl: string | null;
  /** The id of the selected logo preset. */
  logoPreset: string;

  logoMode: "image" | "text";
  logoText: string;
  logoTextColor: string;
  logoTextFontId: string;
  logoTextSizePx: number;
  logoTextWeight: number;
  logoTextLetterSpacing: number;
}

export const DEFAULT_SYNAPSE_X_THEME: SynapseXTheme = {
  windowBg: "#333333",
  panelBg: "#3C3C3C",
  text: "#ffffff",

  buttonBg: "#3c3c3c",
  buttonHoverBg: "#464646",
  buttonActiveBg: "#323232",
  buttonBorder: "transparent",
  buttonText: "#ffffff",

  tabBg: "#323232",
  tabActiveBg: "#3c3c3c",
  tabBorder: "#3a3a3a",
  tabActiveBorder: "#484848",
  tabText: "#c0c0c0",

  editorBg: "#1e1e1e",

  listHoverBg: "#333333",
  listText: "#c0c0c0",
  scriptList: {
    sectionHeaderBg: "#3C3C3C",
    sectionHeaderText: "#c0c0c0",
    sectionIcon: "#c0c0c0",
    searchBg: "#323232",
    searchPlaceholder: "#6f6f6e",
    rowText: "#c0c0c0",
    rowHoverBg: "#333333",
    rowMutedText: "#5a5a5a",
  },

  iconColor: "#c0c0c0",

  overlayDataUrl: null,
  overlayOpacity: 0.35,
  overlayMode: "behind",
  logoDataUrl: null,
  logoPreset: "synapse-x",
  logoMode: "image",
  logoText: "Synapse X",
  logoTextColor: "#ffffff",
  logoTextFontId: "inter",
  logoTextSizePx: 14,
  logoTextWeight: 600,
  logoTextLetterSpacing: 0,
};

const STORAGE_KEY = "synapse.synapseXTheme.v1";
export const SYNAPSE_X_THEME_CHANGED_EVENT = "synapse:synapse-x-theme-changed";

function safeHex(value: unknown, def: string): string {
  if (typeof value !== "string") return def;
  const v = value.trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : def;
}

function safeOpacity(value: unknown, def: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return def;
  return Math.max(0, Math.min(1, value));
}

function safePx(value: unknown, def: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return def;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function safeDataUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("data:image/")) return null;
  return value;
}

function mergeScriptList(raw: unknown, flat: { listHoverBg: string; listText: string; panelBg: string; tabBg: string; iconColor: string; tabText: string }): ScriptListThemeTokens {
  const d = DEFAULT_SYNAPSE_X_THEME.scriptList;
  const scriptListRaw = raw && typeof raw === "object" ? (raw as Record<string, unknown>).scriptList : undefined;
  const sl = scriptListRaw && typeof scriptListRaw === "object" ? (scriptListRaw as Record<string, unknown>) : null;
  const derived: ScriptListThemeTokens = {
    sectionHeaderBg: flat.panelBg,
    sectionHeaderText: flat.tabText,
    sectionIcon: flat.iconColor,
    searchBg: flat.tabBg,
    searchPlaceholder: "#6f6f6e",
    rowText: flat.listText,
    rowHoverBg: flat.listHoverBg,
    rowMutedText: "#5a5a5a",
  };
  return {
    sectionHeaderBg: safeHex(sl?.sectionHeaderBg, derived.sectionHeaderBg ?? d.sectionHeaderBg),
    sectionHeaderText: safeHex(sl?.sectionHeaderText, derived.sectionHeaderText ?? d.sectionHeaderText),
    sectionIcon: safeHex(sl?.sectionIcon, derived.sectionIcon ?? d.sectionIcon),
    searchBg: safeHex(sl?.searchBg, derived.searchBg ?? d.searchBg),
    searchPlaceholder: safeHex(sl?.searchPlaceholder, derived.searchPlaceholder ?? d.searchPlaceholder),
    rowText: safeHex(sl?.rowText, derived.rowText ?? d.rowText),
    rowHoverBg: safeHex(sl?.rowHoverBg, derived.rowHoverBg ?? d.rowHoverBg),
    rowMutedText: safeHex(sl?.rowMutedText, derived.rowMutedText ?? d.rowMutedText),
  };
}

function mergeWithDefaults(raw: unknown): SynapseXTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SYNAPSE_X_THEME };
  const o = raw as Record<string, unknown>;
  const listHoverBg = safeHex(o.listHoverBg, DEFAULT_SYNAPSE_X_THEME.listHoverBg);
  const listText = safeHex(o.listText, DEFAULT_SYNAPSE_X_THEME.listText);
  const panelBg = safeHex(o.panelBg, DEFAULT_SYNAPSE_X_THEME.panelBg);
  const tabBg = safeHex(o.tabBg, DEFAULT_SYNAPSE_X_THEME.tabBg);
  const iconColor = safeHex(o.iconColor, DEFAULT_SYNAPSE_X_THEME.iconColor);
  const tabText = safeHex(o.tabText, DEFAULT_SYNAPSE_X_THEME.tabText);
  const scriptList = mergeScriptList(raw, { listHoverBg, listText, panelBg, tabBg, iconColor, tabText });
  return {
    windowBg: safeHex(o.windowBg, DEFAULT_SYNAPSE_X_THEME.windowBg),
    panelBg,
    text: safeHex(o.text, DEFAULT_SYNAPSE_X_THEME.text),

    buttonBg: safeHex(o.buttonBg, DEFAULT_SYNAPSE_X_THEME.buttonBg),
    buttonHoverBg: safeHex(o.buttonHoverBg, DEFAULT_SYNAPSE_X_THEME.buttonHoverBg),
    buttonActiveBg: safeHex(o.buttonActiveBg, DEFAULT_SYNAPSE_X_THEME.buttonActiveBg),
    buttonBorder: safeHex(o.buttonBorder, DEFAULT_SYNAPSE_X_THEME.buttonBorder),
    buttonText: safeHex(o.buttonText, DEFAULT_SYNAPSE_X_THEME.buttonText),

    tabBg,
    tabActiveBg: safeHex(o.tabActiveBg, DEFAULT_SYNAPSE_X_THEME.tabActiveBg),
    tabBorder: safeHex(o.tabBorder, DEFAULT_SYNAPSE_X_THEME.tabBorder),
    tabActiveBorder: safeHex(o.tabActiveBorder, DEFAULT_SYNAPSE_X_THEME.tabActiveBorder),
    tabText,

    editorBg: safeHex(o.editorBg, DEFAULT_SYNAPSE_X_THEME.editorBg),

    listHoverBg: scriptList.rowHoverBg,
    listText: scriptList.rowText,
    scriptList,

    iconColor,

    overlayDataUrl: safeDataUrl(o.overlayDataUrl),
    overlayOpacity: safeOpacity(o.overlayOpacity, DEFAULT_SYNAPSE_X_THEME.overlayOpacity),
    overlayMode: o.overlayMode === "top" ? "top" : "behind",
    logoDataUrl: safeDataUrl(o.logoDataUrl),
    logoPreset: typeof o.logoPreset === "string" ? o.logoPreset : DEFAULT_SYNAPSE_X_THEME.logoPreset,
    logoMode: o.logoMode === "text" ? "text" : "image",
    logoText:
      typeof o.logoText === "string" && o.logoText.trim()
        ? o.logoText
        : DEFAULT_SYNAPSE_X_THEME.logoText,
    logoTextColor: safeHex(o.logoTextColor, DEFAULT_SYNAPSE_X_THEME.logoTextColor),
    logoTextFontId:
      typeof o.logoTextFontId === "string" ? o.logoTextFontId : DEFAULT_SYNAPSE_X_THEME.logoTextFontId,
    logoTextSizePx: safePx(o.logoTextSizePx, DEFAULT_SYNAPSE_X_THEME.logoTextSizePx, 8, 32),
    logoTextWeight: safePx(o.logoTextWeight, DEFAULT_SYNAPSE_X_THEME.logoTextWeight, 300, 900),
    logoTextLetterSpacing: safePx(
      o.logoTextLetterSpacing,
      DEFAULT_SYNAPSE_X_THEME.logoTextLetterSpacing,
      -2,
      8,
    ),
  };
}

export function readSynapseXTheme(): SynapseXTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SYNAPSE_X_THEME };
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SYNAPSE_X_THEME };
  }
}

function dispatchChange(): void {
  try {
    window.dispatchEvent(new Event(SYNAPSE_X_THEME_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function writeSynapseXTheme(partial: Partial<SynapseXTheme> & { scriptList?: Partial<ScriptListThemeTokens> }): void {
  const cur = readSynapseXTheme();
  const mergedInput = {
    ...cur,
    ...partial,
    scriptList: partial.scriptList ? { ...cur.scriptList, ...partial.scriptList } : cur.scriptList,
  };
  const next = mergeWithDefaults(mergedInput);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage full or disabled; fail silently and fall back to in-memory */
  }
  dispatchChange();
}

export function resetSynapseXTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  dispatchChange();
}

/* ── Import / Export ──────────────────────────────────────────────────── */

/** Export the current Synapse X theme as a JSON blob download. */
export async function exportSynapseXTheme(): Promise<{ ok: true } | { ok: false; error: string }> {
  const theme = readSynapseXTheme();
  const json = JSON.stringify(theme, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const filename = `synapse-x-theme-${y}-${m}-${day}.json`;

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    return { ok: false, error: "Could not trigger download." };
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return { ok: true };
}

/** Import a Synapse X theme from a JSON file. */
export async function importSynapseXTheme(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file.name.endsWith(".json")) {
    return { ok: false, error: "Please select a .json theme file." };
  }
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Invalid theme file — expected a JSON object." };
    }
    const merged = mergeWithDefaults(parsed);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      return { ok: false, error: "Could not save theme to storage." };
    }
    dispatchChange();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not read or parse the theme file." };
  }
}

/** Check whether the current theme differs from defaults (ignoring media). */
export function isSynapseXThemeCustomized(): boolean {
  const theme = readSynapseXTheme();
  const def = DEFAULT_SYNAPSE_X_THEME;
  for (const key of Object.keys(def) as (keyof SynapseXTheme)[]) {
    if (key === "overlayDataUrl" || key === "logoDataUrl") continue;
    if (theme[key] !== def[key]) return true;
  }
  if (theme.overlayDataUrl !== null) return true;
  if (theme.logoDataUrl !== null) return true;
  return false;
}

/** React hook: live Synapse X theme that updates on local writes and on cross-window storage events. */
export function useSynapseXTheme(): SynapseXTheme {
  const [theme, setTheme] = useState<SynapseXTheme>(() => readSynapseXTheme());

  useEffect(() => {
    const sync = () => setTheme(readSynapseXTheme());
    window.addEventListener(SYNAPSE_X_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNAPSE_X_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return theme;
}
