import { useEffect, useState } from "react";
import type { ScriptListThemeTokens } from "@/app/editor/script-list/ScriptListThemeTokens";

/** OG-shell appearance: universally-applied colours for every surface, an optional
 * overlay image (main window only), and an optional custom logo for top bars / loading.
 * Persisted in localStorage and synced cross-window via storage events. */
export interface OgTheme {
  /** Outer window fill (was hardcoded #232323). */
  windowBg: string;
  /** Top bars + side panels (was hardcoded #282828). */
  panelBg: string;
  /** Top-bar / banner / panel header text (was hardcoded #ffffff). */
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
  /** Enhanced script-list panel colours (when enabled in Settings). */
  scriptList: ScriptListThemeTokens;

  /* ── Icons ───────────────────────────────────────────────── */
  iconColor: string;

  /** Optional data URL for the overlay image; null when not customized. */
  overlayDataUrl: string | null;
  /** 0..1 opacity for the overlay layer. */
  overlayOpacity: number;
  /** Whether the overlay sits behind UI ("behind") or on top with pointer-events: none ("top") */
  overlayMode: "behind" | "top";
  /** Optional data URL for the custom logo; null falls back to bundled synapse-logo. */
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

export const DEFAULT_OG_THEME: OgTheme = {
  windowBg: "#232323",
  panelBg: "#282828",
  text: "#ffffff",

  buttonBg: "#272727",
  buttonHoverBg: "#303030",
  buttonActiveBg: "#2a2a2a",
  buttonBorder: "#2d2d2d",
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
    sectionHeaderBg: "#282828",
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
  logoPreset: "synapseOriginal",
  logoMode: "image",
  logoText: "Synapse",
  logoTextColor: "#ffffff",
  logoTextFontId: "inter",
  logoTextSizePx: 14,
  logoTextWeight: 600,
  logoTextLetterSpacing: 0,
};

const STORAGE_KEY = "synapse.ogTheme.v1";
export const OG_THEME_CHANGED_EVENT = "synapse:og-theme-changed";

/** Hex string with `#RRGGBB` shape; falls back to `def` if input is malformed. */
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

function mergeScriptList(raw: unknown, flat: { listHoverBg: string; listText: string; panelBg: string; text: string; tabBg: string; iconColor: string; tabText: string }): ScriptListThemeTokens {
  const d = DEFAULT_OG_THEME.scriptList;
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

function mergeWithDefaults(raw: unknown): OgTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_OG_THEME };
  const o = raw as Record<string, unknown>;
  const listHoverBg = safeHex(o.listHoverBg, DEFAULT_OG_THEME.listHoverBg);
  const listText = safeHex(o.listText, DEFAULT_OG_THEME.listText);
  const panelBg = safeHex(o.panelBg, DEFAULT_OG_THEME.panelBg);
  const text = safeHex(o.text, DEFAULT_OG_THEME.text);
  const tabBg = safeHex(o.tabBg, DEFAULT_OG_THEME.tabBg);
  const iconColor = safeHex(o.iconColor, DEFAULT_OG_THEME.iconColor);
  const tabText = safeHex(o.tabText, DEFAULT_OG_THEME.tabText);
  const scriptList = mergeScriptList(raw, { listHoverBg, listText, panelBg, text, tabBg, iconColor, tabText });
  return {
    windowBg: safeHex(o.windowBg, DEFAULT_OG_THEME.windowBg),
    panelBg,
    text,

    buttonBg: safeHex(o.buttonBg, DEFAULT_OG_THEME.buttonBg),
    buttonHoverBg: safeHex(o.buttonHoverBg, DEFAULT_OG_THEME.buttonHoverBg),
    buttonActiveBg: safeHex(o.buttonActiveBg, DEFAULT_OG_THEME.buttonActiveBg),
    buttonBorder: safeHex(o.buttonBorder, DEFAULT_OG_THEME.buttonBorder),
    buttonText: safeHex(o.buttonText, DEFAULT_OG_THEME.buttonText),

    tabBg,
    tabActiveBg: safeHex(o.tabActiveBg, DEFAULT_OG_THEME.tabActiveBg),
    tabBorder: safeHex(o.tabBorder, DEFAULT_OG_THEME.tabBorder),
    tabActiveBorder: safeHex(o.tabActiveBorder, DEFAULT_OG_THEME.tabActiveBorder),
    tabText,

    editorBg: safeHex(o.editorBg, DEFAULT_OG_THEME.editorBg),

    listHoverBg: scriptList.rowHoverBg,
    listText: scriptList.rowText,
    scriptList,

    iconColor,

    overlayDataUrl: safeDataUrl(o.overlayDataUrl),
    overlayOpacity: safeOpacity(o.overlayOpacity, DEFAULT_OG_THEME.overlayOpacity),
    overlayMode: o.overlayMode === "top" ? "top" : "behind",
    logoDataUrl: safeDataUrl(o.logoDataUrl),
    logoPreset: typeof o.logoPreset === "string" ? o.logoPreset : DEFAULT_OG_THEME.logoPreset,
    logoMode: o.logoMode === "text" ? "text" : "image",
    logoText:
      typeof o.logoText === "string" && o.logoText.trim() ? o.logoText : DEFAULT_OG_THEME.logoText,
    logoTextColor: safeHex(o.logoTextColor, DEFAULT_OG_THEME.logoTextColor),
    logoTextFontId:
      typeof o.logoTextFontId === "string" ? o.logoTextFontId : DEFAULT_OG_THEME.logoTextFontId,
    logoTextSizePx: safePx(o.logoTextSizePx, DEFAULT_OG_THEME.logoTextSizePx, 8, 32),
    logoTextWeight: safePx(o.logoTextWeight, DEFAULT_OG_THEME.logoTextWeight, 300, 900),
    logoTextLetterSpacing: safePx(
      o.logoTextLetterSpacing,
      DEFAULT_OG_THEME.logoTextLetterSpacing,
      -2,
      8,
    ),
  };
}

export function readOgTheme(): OgTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OG_THEME };
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_OG_THEME };
  }
}

function dispatchChange(): void {
  try {
    window.dispatchEvent(new Event(OG_THEME_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function writeOgTheme(partial: Partial<OgTheme> & { scriptList?: Partial<ScriptListThemeTokens> }): void {
  const cur = readOgTheme();
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

export function resetOgTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  dispatchChange();
}

/* ── Import / Export ──────────────────────────────────────────────────── */

/** Export the current OG theme as a JSON blob download. */
export async function exportOgTheme(): Promise<{ ok: true } | { ok: false; error: string }> {
  const theme = readOgTheme();
  const json = JSON.stringify(theme, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const filename = `og-theme-${y}-${m}-${day}.json`;

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

/** Import an OG theme from a JSON file. */
export async function importOgTheme(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
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
export function isOgThemeCustomized(): boolean {
  const theme = readOgTheme();
  const def = DEFAULT_OG_THEME;
  for (const key of Object.keys(def) as (keyof OgTheme)[]) {
    if (key === "overlayDataUrl" || key === "logoDataUrl") continue;
    if (theme[key] !== def[key]) return true;
  }
  if (theme.overlayDataUrl !== null) return true;
  if (theme.logoDataUrl !== null) return true;
  return false;
}

/** React hook: live OG theme that updates on local writes and on cross-window storage events. */
export function useOgTheme(): OgTheme {
  const [theme, setTheme] = useState<OgTheme>(() => readOgTheme());

  useEffect(() => {
    const sync = () => setTheme(readOgTheme());
    window.addEventListener(OG_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OG_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return theme;
}
