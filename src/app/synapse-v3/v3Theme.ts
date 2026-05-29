import { useEffect, useState } from "react";
import type { UiFontId } from "@/ui/shellTheme";
import { normalizeUiFontId } from "@/ui/uiFontStacks";
import { isTopBarLogoPresetId } from "@/ui/topBarLogos";
import imgV3LoadingBgDefault from "./remake-assets/v3-loading-bg.png?url";

/** V3 undecorated window frame — border + outer glow on shell. */
export const V3_WINDOW_EDGE_BORDER = "#4b4d4c";
export const V3_WINDOW_EDGE_SHADOW = "0px 0px 18.3px 0px rgba(0,0,0,0.213)";

export type V3OverlayMode = "behind" | "top";
export type V3BackgroundMode = "none" | "image" | "video";

export type V3ThemePresetId =
  | "framework"
  | "midnight"
  | "graphite"
  | "ocean"
  | "ember"
  | "highContrast"
  | "novo";

export interface V3ThemeShell {
  windowBg: string;
  shellBorder: string;
  edgeShadow: string;
  pageBg: string;
  contentBg: string;
  cornerRadiusPx: number;
}

export interface V3ThemeTopBar {
  bg: string;
  text: string;
  mutedText: string;
  navIcon: string;
  navActiveUnderline: string;
}

export interface V3ThemeEditor {
  workAreaBg: string;
  tabBarBg: string;
  tabInactiveBg: string;
  tabActiveBg: string;
  tabText: string;
  tabBorder: string;
  monacoThemeId: string;
}

export interface V3ThemeScriptList {
  sectionHeaderBg: string;
  sectionHeaderText: string;
  sectionIcon: string;
  searchBg: string;
  searchPlaceholder: string;
  rowText: string;
  rowHoverBg: string;
  rowMutedText: string;
}

/** SynapseAI chat sidebar chrome (not editor proposal overlays). */
export interface V3ThemeAiSidebar {
  panelBg: string;
  panelBorder: string;
  headerBg: string;
  headerText: string;
  headerMuted: string;
  messageUserBg: string;
  messageAssistantBg: string;
  messageBorder: string;
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  iconMuted: string;
  accentText: string;
  warningBg: string;
  warningText: string;
  errorText: string;
}

/** Editor AI proposal overlays (Monaco highlights + bottom review card). */
export interface V3ThemeAiOverlay {
  panelBg: string;
  panelBorder: string;
  headerText: string;
  buttonBg: string;
  buttonText: string;
  acceptBg: string;
  acceptText: string;
  highlightBg: string;
  highlightActiveBg: string;
  highlightLineBg: string;
  diffZoneBg: string;
  diffZoneBorder: string;
  diffRemovedText: string;
  diffAddedText: string;
}

export interface V3ThemeActionBar {
  barBg: string;
  buttonBg: string;
  buttonBorder: string;
  buttonHover: string;
  buttonText: string;
  buttonIcon: string;
  buttonDisabledBg: string;
  buttonDisabledText: string;
  buttonDisabledIcon: string;
  attachIndicatorOn: string;
  attachIndicatorOff: string;
}

/** Universal stroke/fill for UI icons (nav, tabs, script list, action buttons). */
export interface V3ThemeIcons {
  color: string;
  muted: string;
}

export interface V3ThemeSettingsChrome {
  sectionHeaderBg: string;
  labelText: string;
  descriptionText: string;
  checkboxOn: string;
  checkboxOff: string;
  sidebarActiveBg: string;
  sidebarAccent: string;
  controlBg: string;
  controlBorder: string;
  controlHoverBg: string;
  controlText: string;
  fieldBg: string;
  fieldBorder: string;
  sidebarIcon: string;
  chipSelectedBorder: string;
}

export interface V3ThemeScriptHub {
  searchBg: string;
  searchBorder: string;
  searchText: string;
  searchPlaceholder: string;
  /** Divider under source tabs (defaults to settings control border). */
  toggleDivider: string;
  /** Active tab underline (defaults to accent primary). */
  toggleIndicator: string;
  toggleActiveText: string;
  toggleInactiveText: string;
  /** @deprecated Pill fill — kept for import/migrate only. */
  toggleTrackBg?: string;
  /** @deprecated Pill fill — kept for import/migrate only. */
  toggleActiveBg?: string;
  /** @deprecated Pill border — migrated to toggleIndicator. */
  toggleActiveBorder?: string;
  /** When true, source tab colours use scriptHub overrides instead of accent + top bar. */
  toggleCustomized?: boolean;
  cardGlassBg: string;
  cardGlassBorder: string;
  cardScrimFrom: string;
  cardTitleText: string;
  cardSubtitleText: string;
  cardShadow: string;
  cardExecuteBg: string;
  cardExecuteDisabledBg: string;
  cardIconBtnBg: string;
  statusText: string;
  errorText: string;
  paginationText: string;
}

export interface V3ThemeAccent {
  primary: string;
  primaryMuted: string;
  selectionBorder: string;
  focusRing: string;
}

export interface V3ThemeOverlay {
  backgroundMode: V3BackgroundMode;
  imageDataUrl: string | null;
  hasStoredBackgroundImage: boolean;
  backgroundImageFilename: string | null;
  hasStoredVideo: boolean;
  videoFilename: string | null;
  opacity: number;
  blurPx: number;
  mode: V3OverlayMode;
  mediaBlurPx: number;
  mediaSaturate: number;
  position: { x: number; y: number };
  pageScrimOpacity: number;
}

/** Startup loading splash background (separate from editor wallpaper overlay). */
export interface V3ThemeLoading {
  imageDataUrl: string | null;
  hasStoredLoadingImage: boolean;
  loadingImageFilename: string | null;
}

export const V3_DEFAULT_LOADING_IMAGE_URL = imgV3LoadingBgDefault;

export interface V3ThemeTypography {
  uiFontId: UiFontId;
  uiFontSizeStep: number;
}

export interface V3ThemeSimple {
  presetId: V3ThemePresetId;
  accentHex: string;
  darkness: number;
  contrast: number;
}

/** Built-in V3 top bar wordmark (`v3-logo.png`). Other values use `TOP_BAR_LOGO_PRESETS`. */
export const V3_DEFAULT_TOP_BAR_LOGO_PRESET = "v3-default";

export interface V3ThemeBranding {
  topBarLogoPreset: string;
  /** Custom top-bar logo; null uses preset or built-in V3 wordmark. */
  logoDataUrl: string | null;
  logoMode: "image" | "text";
  logoText: string;
  logoTextColor: string;
  logoTextFontId: string;
  logoTextSizePx: number;
  logoTextWeight: number;
  logoTextLetterSpacing: number;
}

export function isV3BrandingLogoPreset(id: string): boolean {
  return id === V3_DEFAULT_TOP_BAR_LOGO_PRESET || isTopBarLogoPresetId(id);
}

export interface V3ThemeState {
  shell: V3ThemeShell;
  topBar: V3ThemeTopBar;
  editor: V3ThemeEditor;
  scriptList: V3ThemeScriptList;
  aiSidebar: V3ThemeAiSidebar;
  aiOverlay: V3ThemeAiOverlay;
  scriptHub: V3ThemeScriptHub;
  actionBar: V3ThemeActionBar;
  icons: V3ThemeIcons;
  settingsChrome: V3ThemeSettingsChrome;
  accent: V3ThemeAccent;
  overlay: V3ThemeOverlay;
  loading: V3ThemeLoading;
  typography: V3ThemeTypography;
  branding: V3ThemeBranding;
  simple: V3ThemeSimple;
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function isLegacyPillScriptHubToggle(sh: V3ThemeScriptHub): boolean {
  const bg = (sh.toggleActiveBg ?? "transparent").replace(/\s/g, "").toLowerCase();
  if (bg === "transparent" || bg === "") return false;
  if (bg.includes("74,143,212")) return true;
  return !bg.startsWith("rgba(0,0,0,0)") && bg !== "transparent";
}

/** Underline source tabs — tied to accent + top bar (no filled pill). */
export function deriveScriptHubToggleFromAccent(
  accent: V3ThemeAccent,
  topBar: V3ThemeTopBar,
  settingsChrome?: V3ThemeSettingsChrome,
): Pick<V3ThemeScriptHub, "toggleDivider" | "toggleIndicator" | "toggleActiveText" | "toggleInactiveText"> {
  return {
    toggleDivider: settingsChrome?.controlBorder ?? "rgba(255,255,255,0.12)",
    toggleIndicator: accent.primary,
    toggleActiveText: topBar.text,
    toggleInactiveText: topBar.mutedText,
  };
}

/** Migrate stored pill toggle → underline tokens; sync from accent when not customized. */
export function syncScriptHubToggleFromAccent(theme: V3ThemeState): V3ThemeState {
  const derived = deriveScriptHubToggleFromAccent(theme.accent, theme.topBar, theme.settingsChrome);
  const hadPill =
    isLegacyPillScriptHubToggle(theme.scriptHub) ||
    theme.scriptHub.toggleIndicator == null ||
    theme.scriptHub.toggleDivider == null;
  if (theme.scriptHub.toggleCustomized && !hadPill) {
    return theme;
  }
  return {
    ...theme,
    scriptHub: {
      ...theme.scriptHub,
      ...derived,
      toggleCustomized: hadPill ? false : theme.scriptHub.toggleCustomized,
      toggleTrackBg: undefined,
      toggleActiveBg: undefined,
      toggleActiveBorder: undefined,
    },
  };
}

/** Default AI sidebar colours derived from script list, settings chrome, and accent. */
export function deriveDefaultAiSidebar(
  scriptList: V3ThemeScriptList,
  settingsChrome: V3ThemeSettingsChrome,
  accent: V3ThemeAccent,
  topBar: V3ThemeTopBar,
  editor: V3ThemeEditor,
): V3ThemeAiSidebar {
  return {
    panelBg: scriptList.searchBg,
    panelBorder: "rgba(255,255,255,0.08)",
    headerBg: scriptList.searchBg,
    headerText: settingsChrome.labelText,
    headerMuted: scriptList.searchPlaceholder,
    messageUserBg: scriptList.sectionHeaderBg,
    messageAssistantBg: editor.workAreaBg,
    messageBorder: "rgba(255,255,255,0.06)",
    inputBg: "transparent",
    inputText: settingsChrome.labelText,
    inputPlaceholder: scriptList.searchPlaceholder,
    iconMuted: scriptList.sectionIcon,
    accentText: "#eab308",
    warningBg: "rgba(234, 179, 8, 0.12)",
    warningText: "#eab308",
    errorText: "#cf6363",
  };
}

/** Default editor AI overlay colours derived from editor work area and accent. */
export function deriveDefaultAiOverlay(
  editor: V3ThemeEditor,
  accent: V3ThemeAccent,
  aiSidebar: V3ThemeAiSidebar,
): V3ThemeAiOverlay {
  return {
    panelBg: editor.workAreaBg,
    panelBorder: "rgba(234, 179, 8, 0.35)",
    headerText: aiSidebar.accentText,
    buttonBg: "rgba(255,255,255,0.06)",
    buttonText: "#d4d4d4",
    acceptBg: "rgba(34, 197, 94, 0.22)",
    acceptText: "#86efac",
    highlightBg: "rgba(234, 179, 8, 0.28)",
    highlightActiveBg: "rgba(234, 179, 8, 0.45)",
    highlightLineBg: "rgba(234, 179, 8, 0.08)",
    diffZoneBg: editor.workAreaBg,
    diffZoneBorder: "rgba(255,255,255,0.08)",
    diffRemovedText: "#f87171",
    diffAddedText: "#86efac",
  };
}

function safeColorOrRgba(value: unknown, def: string): string {
  if (typeof value !== "string" || !value.trim()) return def;
  return value.trim();
}

/** Default Script Hub colours derived from script list + accent. */
export function deriveDefaultScriptHub(
  scriptList: V3ThemeScriptList,
  accent: V3ThemeAccent,
  topBar: V3ThemeTopBar,
  settingsChrome?: V3ThemeSettingsChrome,
): V3ThemeScriptHub {
  return {
    searchBg: scriptList.searchBg,
    searchBorder: "rgba(255,255,255,0.1)",
    searchText: topBar.text,
    searchPlaceholder: scriptList.searchPlaceholder,
    ...deriveScriptHubToggleFromAccent(accent, topBar, settingsChrome),
    cardGlassBg: "rgba(30,30,30,0.15)",
    cardGlassBorder: "rgba(255,255,255,0.1)",
    cardScrimFrom: "rgba(0,0,0,0.55)",
    cardTitleText: topBar.text,
    cardSubtitleText: topBar.mutedText,
    cardShadow: "0px 2px 8px rgba(0,0,0,0.25)",
    cardExecuteBg: "rgba(255,255,255,0.12)",
    cardExecuteDisabledBg: "rgba(0,0,0,0.25)",
    cardIconBtnBg: "rgba(255,255,255,0.08)",
    statusText: topBar.mutedText,
    errorText: "#cc6e6e",
    paginationText: topBar.mutedText,
  };
}

function deriveDefaultSettingsChrome(
  accent: V3ThemeAccent,
  topBar: V3ThemeTopBar,
): Pick<
  V3ThemeSettingsChrome,
  "controlBg" | "controlBorder" | "controlHoverBg" | "controlText" | "fieldBg" | "fieldBorder" | "sidebarIcon" | "chipSelectedBorder"
> {
  return {
    controlBg: "#373737",
    controlBorder: "#3d3d3c",
    controlHoverBg: "#404040",
    controlText: topBar.text,
    fieldBg: "#373737",
    fieldBorder: "#3d3d3c",
    sidebarIcon: "#8d8d8d",
    chipSelectedBorder: accent.primary,
  };
}

export const DEFAULT_V3_THEME: V3ThemeState = {
  shell: {
    windowBg: "#212120",
    shellBorder: V3_WINDOW_EDGE_BORDER,
    edgeShadow: V3_WINDOW_EDGE_SHADOW,
    pageBg: "#151515",
    contentBg: "#151515",
    cornerRadiusPx: 7,
  },
  topBar: {
    bg: "#212120",
    text: "#ffffff",
    mutedText: "#8d8d8d",
    navIcon: "#ffffff",
    navActiveUnderline: "#ffffff",
  },
  editor: {
    workAreaBg: "#1e1e1e",
    tabBarBg: "#212120",
    tabInactiveBg: "#212120",
    tabActiveBg: "#2d2d2d",
    tabText: "#ffffff",
    tabBorder: "#3a3a3a",
    monacoThemeId: "shell-custom",
  },
  scriptList: {
    sectionHeaderBg: "#313131",
    sectionHeaderText: "#b7b7b7",
    sectionIcon: "#868686",
    searchBg: "#2d2d2d",
    searchPlaceholder: "#6f6f6e",
    rowText: "#c0c0c0",
    rowHoverBg: "#2d2d2d",
    rowMutedText: "#5a5a5a",
  },
  aiSidebar: {
    panelBg: "#2d2d2d",
    panelBorder: "rgba(255,255,255,0.08)",
    headerBg: "#2d2d2d",
    headerText: "#ffffff",
    headerMuted: "#6f6f6e",
    messageUserBg: "#313131",
    messageAssistantBg: "#1e1e1e",
    messageBorder: "rgba(255,255,255,0.06)",
    inputBg: "transparent",
    inputText: "#ffffff",
    inputPlaceholder: "#6f6f6e",
    iconMuted: "#868686",
    accentText: "#eab308",
    warningBg: "rgba(234, 179, 8, 0.12)",
    warningText: "#eab308",
    errorText: "#cf6363",
  },
  aiOverlay: {
    panelBg: "#1e1e1e",
    panelBorder: "rgba(234, 179, 8, 0.35)",
    headerText: "#eab308",
    buttonBg: "rgba(255,255,255,0.06)",
    buttonText: "#d4d4d4",
    acceptBg: "rgba(34, 197, 94, 0.22)",
    acceptText: "#86efac",
    highlightBg: "rgba(234, 179, 8, 0.28)",
    highlightActiveBg: "rgba(234, 179, 8, 0.45)",
    highlightLineBg: "rgba(234, 179, 8, 0.08)",
    diffZoneBg: "#1e1e1e",
    diffZoneBorder: "rgba(255,255,255,0.08)",
    diffRemovedText: "#f87171",
    diffAddedText: "#86efac",
  },
  actionBar: {
    barBg: "#212120",
    buttonBg: "#383838",
    buttonBorder: "#404040",
    buttonHover: "#404040",
    buttonText: "#f6f6f5",
    buttonIcon: "#ffffff",
    buttonDisabledBg: "#2d2d2d",
    buttonDisabledText: "#8e8e8e",
    buttonDisabledIcon: "#8e8e8e",
    attachIndicatorOn: "#5ee85e",
    attachIndicatorOff: "#e8c84a",
  },
  icons: {
    color: "#ffffff",
    muted: "#868686",
  },
  settingsChrome: {
    sectionHeaderBg: "#303030",
    labelText: "#ffffff",
    descriptionText: "#6b6b6b",
    checkboxOn: "#b0d8e5",
    checkboxOff: "#212120",
    sidebarActiveBg: "#313131",
    sidebarAccent: "#bdd3de",
    ...deriveDefaultSettingsChrome(
      { primary: "#225a7a", primaryMuted: "#b0d8e5", selectionBorder: "#225a7a", focusRing: "#6a8fff" },
      { bg: "#212120", text: "#ffffff", mutedText: "#8d8d8d", navIcon: "#ffffff", navActiveUnderline: "#ffffff" },
    ),
  },
  scriptHub: deriveDefaultScriptHub(
    {
      sectionHeaderBg: "#313131",
      sectionHeaderText: "#b7b7b7",
      sectionIcon: "#868686",
      searchBg: "#2d2d2d",
      searchPlaceholder: "#6f6f6e",
      rowText: "#c0c0c0",
      rowHoverBg: "#2d2d2d",
      rowMutedText: "#5a5a5a",
    },
    { primary: "#225a7a", primaryMuted: "#b0d8e5", selectionBorder: "#225a7a", focusRing: "#6a8fff" },
    { bg: "#212120", text: "#ffffff", mutedText: "#8d8d8d", navIcon: "#ffffff", navActiveUnderline: "#ffffff" },
    {
      sectionHeaderBg: "#313131",
      labelText: "#ffffff",
      descriptionText: "#8d8d8d",
      checkboxOn: "#225a7a",
      checkboxOff: "#212120",
      sidebarActiveBg: "#313131",
      sidebarAccent: "#bdd3de",
      controlBg: "#2d2d2d",
      controlBorder: "rgba(255,255,255,0.12)",
      controlHoverBg: "#383838",
      controlText: "#ffffff",
      fieldBg: "#2d2d2d",
      fieldBorder: "rgba(255,255,255,0.12)",
      sidebarIcon: "#868686",
      chipSelectedBorder: "#225a7a",
    },
  ),
  accent: {
    primary: "#225a7a",
    primaryMuted: "#b0d8e5",
    selectionBorder: "#225a7a",
    focusRing: "#6a8fff",
  },
  overlay: {
    backgroundMode: "none",
    imageDataUrl: null,
    hasStoredBackgroundImage: false,
    backgroundImageFilename: null,
    hasStoredVideo: false,
    videoFilename: null,
    opacity: 0.35,
    blurPx: 0,
    mode: "behind",
    mediaBlurPx: 0,
    mediaSaturate: 1,
    position: { x: 50, y: 50 },
    pageScrimOpacity: 0.55,
  },
  loading: {
    imageDataUrl: V3_DEFAULT_LOADING_IMAGE_URL,
    hasStoredLoadingImage: false,
    loadingImageFilename: null,
  },
  typography: {
    uiFontId: "inter",
    uiFontSizeStep: 0,
  },
  branding: {
    topBarLogoPreset: V3_DEFAULT_TOP_BAR_LOGO_PRESET,
    logoDataUrl: null,
    logoMode: "image",
    logoText: "FRAMEWORK",
    logoTextColor: "#ffffff",
    logoTextFontId: "inter",
    logoTextSizePx: 14,
    logoTextWeight: 600,
    logoTextLetterSpacing: 0,
  },
  simple: {
    presetId: "framework",
    accentHex: "#225a7a",
    darkness: 50,
    contrast: 50,
  },
};

const STORAGE_KEY = "synapse.v3Theme.v1";
export const V3_THEME_CHANGED_EVENT = "synapse:v3-theme-changed";

const THEME_UI_KEY = "synapse.v3ThemeUi.v1";

export const V3_LIVE_EDIT_CHANGED_EVENT = "synapse:v3-live-edit-changed";

type V3ThemeUiPrefs = {
  advancedMode?: boolean;
  liveEditEnabled?: boolean;
};

function readV3ThemeUiPrefs(): V3ThemeUiPrefs {
  try {
    const raw = localStorage.getItem(THEME_UI_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as V3ThemeUiPrefs;
  } catch {
    return {};
  }
}

function writeV3ThemeUiPrefs(partial: Partial<V3ThemeUiPrefs>): void {
  try {
    const next = { ...readV3ThemeUiPrefs(), ...partial };
    localStorage.setItem(THEME_UI_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function dispatchLiveEditChanged(): void {
  try {
    window.dispatchEvent(new Event(V3_LIVE_EDIT_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function readV3ThemeUiAdvanced(): boolean {
  return readV3ThemeUiPrefs().advancedMode === true;
}

export function writeV3ThemeUiAdvanced(advancedMode: boolean): void {
  writeV3ThemeUiPrefs({ advancedMode });
}

export function readV3ThemeUiLiveEdit(): boolean {
  return readV3ThemeUiPrefs().liveEditEnabled === true;
}

export function writeV3ThemeUiLiveEdit(liveEditEnabled: boolean): void {
  writeV3ThemeUiPrefs({ liveEditEnabled });
  dispatchLiveEditChanged();
}

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
  return Math.min(max, Math.max(min, Math.round(value)));
}

function safeBackgroundMode(value: unknown, def: V3BackgroundMode): V3BackgroundMode {
  return value === "image" || value === "video" || value === "none" ? value : def;
}

function safePosition(
  value: unknown,
  def: { x: number; y: number },
): { x: number; y: number } {
  if (!value || typeof value !== "object") return def;
  const o = value as Record<string, unknown>;
  return {
    x: safePx(o.x, def.x, 0, 100),
    y: safePx(o.y, def.y, 0, 100),
  };
}

function safeMediaSaturate(value: unknown, def: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return def;
  return Math.max(0, Math.min(2, value));
}

function safeDataUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("data:image/")) return null;
  return value;
}

function safePresetId(value: unknown): V3ThemePresetId {
  const ids: V3ThemePresetId[] = [
    "framework",
    "midnight",
    "graphite",
    "ocean",
    "ember",
    "highContrast",
    "novo",
  ];
  return ids.includes(value as V3ThemePresetId) ? (value as V3ThemePresetId) : "framework";
}

/** Legacy unplugged attach colors that read as grey — migrate to yellow. */
const LEGACY_GREY_ATTACH_OFF = new Set([
  "#888888",
  "#8e8e8e",
  "#868686",
  "#898989",
  "#7a7a7a",
  "#6a6a6a",
]);

function normalizeAttachIndicatorOff(hex: string, fallback: string): string {
  const lower = hex.toLowerCase();
  return LEGACY_GREY_ATTACH_OFF.has(lower) ? fallback : hex;
}

export function normalizeV3Theme(raw: unknown): V3ThemeState {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_V3_THEME);
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_V3_THEME;

  const shellRaw = o.shell as Record<string, unknown> | undefined;
  const topBarRaw = o.topBar as Record<string, unknown> | undefined;
  const editorRaw = o.editor as Record<string, unknown> | undefined;
  const scriptListRaw = o.scriptList as Record<string, unknown> | undefined;
  const aiSidebarRaw = o.aiSidebar as Record<string, unknown> | undefined;
  const aiOverlayRaw = o.aiOverlay as Record<string, unknown> | undefined;
  const actionBarRaw = o.actionBar as Record<string, unknown> | undefined;
  const iconsRaw = o.icons as Record<string, unknown> | undefined;
  const scriptHubRaw = o.scriptHub as Record<string, unknown> | undefined;
  const settingsChromeRaw = o.settingsChrome as Record<string, unknown> | undefined;
  const accentRaw = o.accent as Record<string, unknown> | undefined;
  const overlayRaw = o.overlay as Record<string, unknown> | undefined;
  const loadingRaw = o.loading as Record<string, unknown> | undefined;
  const typographyRaw = o.typography as Record<string, unknown> | undefined;
  const brandingRaw = o.branding as Record<string, unknown> | undefined;
  const simpleRaw = o.simple as Record<string, unknown> | undefined;

  const theme: V3ThemeState = {
    shell: {
      windowBg: safeHex(shellRaw?.windowBg, d.shell.windowBg),
      shellBorder: safeHex(shellRaw?.shellBorder, d.shell.shellBorder),
      edgeShadow: typeof shellRaw?.edgeShadow === "string" ? shellRaw.edgeShadow : d.shell.edgeShadow,
      pageBg: safeHex(shellRaw?.pageBg, d.shell.pageBg),
      contentBg: safeHex(shellRaw?.contentBg, d.shell.contentBg),
      cornerRadiusPx: safePx(shellRaw?.cornerRadiusPx, d.shell.cornerRadiusPx, 0, 24),
    },
    topBar: {
      bg: safeHex(topBarRaw?.bg, d.topBar.bg),
      text: safeHex(topBarRaw?.text, d.topBar.text),
      mutedText: safeHex(topBarRaw?.mutedText, d.topBar.mutedText),
      navIcon: safeHex(topBarRaw?.navIcon, d.topBar.navIcon),
      navActiveUnderline: safeHex(topBarRaw?.navActiveUnderline, d.topBar.navActiveUnderline),
    },
    editor: {
      workAreaBg: safeHex(editorRaw?.workAreaBg, d.editor.workAreaBg),
      tabBarBg: safeHex(editorRaw?.tabBarBg, d.editor.tabBarBg),
      tabInactiveBg: safeHex(editorRaw?.tabInactiveBg, d.editor.tabInactiveBg),
      tabActiveBg: safeHex(editorRaw?.tabActiveBg, d.editor.tabActiveBg),
      tabText: safeHex(editorRaw?.tabText, d.editor.tabText),
      tabBorder: safeHex(editorRaw?.tabBorder, d.editor.tabBorder),
      monacoThemeId: typeof editorRaw?.monacoThemeId === "string" ? editorRaw.monacoThemeId : d.editor.monacoThemeId,
    },
    scriptList: {
      sectionHeaderBg: safeHex(scriptListRaw?.sectionHeaderBg, d.scriptList.sectionHeaderBg),
      sectionHeaderText: safeHex(scriptListRaw?.sectionHeaderText, d.scriptList.sectionHeaderText),
      sectionIcon: safeHex(scriptListRaw?.sectionIcon, d.scriptList.sectionIcon),
      searchBg: safeHex(scriptListRaw?.searchBg, d.scriptList.searchBg),
      searchPlaceholder: safeHex(scriptListRaw?.searchPlaceholder, d.scriptList.searchPlaceholder),
      rowText: safeHex(scriptListRaw?.rowText, d.scriptList.rowText),
      rowHoverBg: safeHex(scriptListRaw?.rowHoverBg, d.scriptList.rowHoverBg),
      rowMutedText: safeHex(scriptListRaw?.rowMutedText, d.scriptList.rowMutedText),
    },
    aiSidebar: (() => {
      const derived = deriveDefaultAiSidebar(
        {
          sectionHeaderBg: safeHex(scriptListRaw?.sectionHeaderBg, d.scriptList.sectionHeaderBg),
          sectionHeaderText: safeHex(scriptListRaw?.sectionHeaderText, d.scriptList.sectionHeaderText),
          sectionIcon: safeHex(scriptListRaw?.sectionIcon, d.scriptList.sectionIcon),
          searchBg: safeHex(scriptListRaw?.searchBg, d.scriptList.searchBg),
          searchPlaceholder: safeHex(scriptListRaw?.searchPlaceholder, d.scriptList.searchPlaceholder),
          rowText: safeHex(scriptListRaw?.rowText, d.scriptList.rowText),
          rowHoverBg: safeHex(scriptListRaw?.rowHoverBg, d.scriptList.rowHoverBg),
          rowMutedText: safeHex(scriptListRaw?.rowMutedText, d.scriptList.rowMutedText),
        },
        {
          sectionHeaderBg: safeHex(settingsChromeRaw?.sectionHeaderBg, d.settingsChrome.sectionHeaderBg),
          labelText: safeHex(settingsChromeRaw?.labelText, d.settingsChrome.labelText),
          descriptionText: safeHex(settingsChromeRaw?.descriptionText, d.settingsChrome.descriptionText),
          checkboxOn: safeHex(settingsChromeRaw?.checkboxOn, d.settingsChrome.checkboxOn),
          checkboxOff: safeHex(settingsChromeRaw?.checkboxOff, d.settingsChrome.checkboxOff),
          sidebarActiveBg: safeHex(settingsChromeRaw?.sidebarActiveBg, d.settingsChrome.sidebarActiveBg),
          sidebarAccent: safeHex(settingsChromeRaw?.sidebarAccent, d.settingsChrome.sidebarAccent),
          controlBg: safeHex(settingsChromeRaw?.controlBg, d.settingsChrome.controlBg),
          controlBorder: safeHex(settingsChromeRaw?.controlBorder, d.settingsChrome.controlBorder),
          controlHoverBg: safeHex(settingsChromeRaw?.controlHoverBg, d.settingsChrome.controlHoverBg),
          controlText: safeHex(settingsChromeRaw?.controlText, d.settingsChrome.controlText),
          fieldBg: safeHex(settingsChromeRaw?.fieldBg, d.settingsChrome.fieldBg),
          fieldBorder: safeHex(settingsChromeRaw?.fieldBorder, d.settingsChrome.fieldBorder),
          sidebarIcon: safeHex(settingsChromeRaw?.sidebarIcon, d.settingsChrome.sidebarIcon),
          chipSelectedBorder: safeHex(settingsChromeRaw?.chipSelectedBorder, d.settingsChrome.chipSelectedBorder),
        },
        {
          primary: safeHex(accentRaw?.primary, d.accent.primary),
          primaryMuted: safeHex(accentRaw?.primaryMuted, d.accent.primaryMuted),
          selectionBorder: safeHex(accentRaw?.selectionBorder, d.accent.selectionBorder),
          focusRing: safeHex(accentRaw?.focusRing, d.accent.focusRing),
        },
        {
          bg: safeHex(topBarRaw?.bg, d.topBar.bg),
          text: safeHex(topBarRaw?.text, d.topBar.text),
          mutedText: safeHex(topBarRaw?.mutedText, d.topBar.mutedText),
          navIcon: safeHex(topBarRaw?.navIcon, d.topBar.navIcon),
          navActiveUnderline: safeHex(topBarRaw?.navActiveUnderline, d.topBar.navActiveUnderline),
        },
        {
          workAreaBg: safeHex(editorRaw?.workAreaBg, d.editor.workAreaBg),
          tabBarBg: safeHex(editorRaw?.tabBarBg, d.editor.tabBarBg),
          tabInactiveBg: safeHex(editorRaw?.tabInactiveBg, d.editor.tabInactiveBg),
          tabActiveBg: safeHex(editorRaw?.tabActiveBg, d.editor.tabActiveBg),
          tabText: safeHex(editorRaw?.tabText, d.editor.tabText),
          tabBorder: safeHex(editorRaw?.tabBorder, d.editor.tabBorder),
          monacoThemeId: typeof editorRaw?.monacoThemeId === "string" ? editorRaw.monacoThemeId : d.editor.monacoThemeId,
        },
      );
      if (!aiSidebarRaw || typeof aiSidebarRaw !== "object") return derived;
      return {
        panelBg: safeHex(aiSidebarRaw.panelBg, derived.panelBg),
        panelBorder: safeColorOrRgba(aiSidebarRaw.panelBorder, derived.panelBorder),
        headerBg: safeHex(aiSidebarRaw.headerBg, derived.headerBg),
        headerText: safeHex(aiSidebarRaw.headerText, derived.headerText),
        headerMuted: safeHex(aiSidebarRaw.headerMuted, derived.headerMuted),
        messageUserBg: safeHex(aiSidebarRaw.messageUserBg, derived.messageUserBg),
        messageAssistantBg: safeHex(aiSidebarRaw.messageAssistantBg, derived.messageAssistantBg),
        messageBorder: safeColorOrRgba(aiSidebarRaw.messageBorder, derived.messageBorder),
        inputBg: safeColorOrRgba(aiSidebarRaw.inputBg, derived.inputBg),
        inputText: safeHex(aiSidebarRaw.inputText, derived.inputText),
        inputPlaceholder: safeHex(aiSidebarRaw.inputPlaceholder, derived.inputPlaceholder),
        iconMuted: safeHex(aiSidebarRaw.iconMuted, derived.iconMuted),
        accentText: safeHex(aiSidebarRaw.accentText, derived.accentText),
        warningBg: safeColorOrRgba(aiSidebarRaw.warningBg, derived.warningBg),
        warningText: safeHex(aiSidebarRaw.warningText, derived.warningText),
        errorText: safeHex(aiSidebarRaw.errorText, derived.errorText),
      };
    })(),
    aiOverlay: (() => {
      const derivedAiSidebar = deriveDefaultAiSidebar(
        {
          sectionHeaderBg: safeHex(scriptListRaw?.sectionHeaderBg, d.scriptList.sectionHeaderBg),
          sectionHeaderText: safeHex(scriptListRaw?.sectionHeaderText, d.scriptList.sectionHeaderText),
          sectionIcon: safeHex(scriptListRaw?.sectionIcon, d.scriptList.sectionIcon),
          searchBg: safeHex(scriptListRaw?.searchBg, d.scriptList.searchBg),
          searchPlaceholder: safeHex(scriptListRaw?.searchPlaceholder, d.scriptList.searchPlaceholder),
          rowText: safeHex(scriptListRaw?.rowText, d.scriptList.rowText),
          rowHoverBg: safeHex(scriptListRaw?.rowHoverBg, d.scriptList.rowHoverBg),
          rowMutedText: safeHex(scriptListRaw?.rowMutedText, d.scriptList.rowMutedText),
        },
        {
          sectionHeaderBg: safeHex(settingsChromeRaw?.sectionHeaderBg, d.settingsChrome.sectionHeaderBg),
          labelText: safeHex(settingsChromeRaw?.labelText, d.settingsChrome.labelText),
          descriptionText: safeHex(settingsChromeRaw?.descriptionText, d.settingsChrome.descriptionText),
          checkboxOn: safeHex(settingsChromeRaw?.checkboxOn, d.settingsChrome.checkboxOn),
          checkboxOff: safeHex(settingsChromeRaw?.checkboxOff, d.settingsChrome.checkboxOff),
          sidebarActiveBg: safeHex(settingsChromeRaw?.sidebarActiveBg, d.settingsChrome.sidebarActiveBg),
          sidebarAccent: safeHex(settingsChromeRaw?.sidebarAccent, d.settingsChrome.sidebarAccent),
          controlBg: safeHex(settingsChromeRaw?.controlBg, d.settingsChrome.controlBg),
          controlBorder: safeHex(settingsChromeRaw?.controlBorder, d.settingsChrome.controlBorder),
          controlHoverBg: safeHex(settingsChromeRaw?.controlHoverBg, d.settingsChrome.controlHoverBg),
          controlText: safeHex(settingsChromeRaw?.controlText, d.settingsChrome.controlText),
          fieldBg: safeHex(settingsChromeRaw?.fieldBg, d.settingsChrome.fieldBg),
          fieldBorder: safeHex(settingsChromeRaw?.fieldBorder, d.settingsChrome.fieldBorder),
          sidebarIcon: safeHex(settingsChromeRaw?.sidebarIcon, d.settingsChrome.sidebarIcon),
          chipSelectedBorder: safeHex(settingsChromeRaw?.chipSelectedBorder, d.settingsChrome.chipSelectedBorder),
        },
        {
          primary: safeHex(accentRaw?.primary, d.accent.primary),
          primaryMuted: safeHex(accentRaw?.primaryMuted, d.accent.primaryMuted),
          selectionBorder: safeHex(accentRaw?.selectionBorder, d.accent.selectionBorder),
          focusRing: safeHex(accentRaw?.focusRing, d.accent.focusRing),
        },
        {
          bg: safeHex(topBarRaw?.bg, d.topBar.bg),
          text: safeHex(topBarRaw?.text, d.topBar.text),
          mutedText: safeHex(topBarRaw?.mutedText, d.topBar.mutedText),
          navIcon: safeHex(topBarRaw?.navIcon, d.topBar.navIcon),
          navActiveUnderline: safeHex(topBarRaw?.navActiveUnderline, d.topBar.navActiveUnderline),
        },
        {
          workAreaBg: safeHex(editorRaw?.workAreaBg, d.editor.workAreaBg),
          tabBarBg: safeHex(editorRaw?.tabBarBg, d.editor.tabBarBg),
          tabInactiveBg: safeHex(editorRaw?.tabInactiveBg, d.editor.tabInactiveBg),
          tabActiveBg: safeHex(editorRaw?.tabActiveBg, d.editor.tabActiveBg),
          tabText: safeHex(editorRaw?.tabText, d.editor.tabText),
          tabBorder: safeHex(editorRaw?.tabBorder, d.editor.tabBorder),
          monacoThemeId: typeof editorRaw?.monacoThemeId === "string" ? editorRaw.monacoThemeId : d.editor.monacoThemeId,
        },
      );
      const derived = deriveDefaultAiOverlay(
        {
          workAreaBg: safeHex(editorRaw?.workAreaBg, d.editor.workAreaBg),
          tabBarBg: safeHex(editorRaw?.tabBarBg, d.editor.tabBarBg),
          tabInactiveBg: safeHex(editorRaw?.tabInactiveBg, d.editor.tabInactiveBg),
          tabActiveBg: safeHex(editorRaw?.tabActiveBg, d.editor.tabActiveBg),
          tabText: safeHex(editorRaw?.tabText, d.editor.tabText),
          tabBorder: safeHex(editorRaw?.tabBorder, d.editor.tabBorder),
          monacoThemeId: typeof editorRaw?.monacoThemeId === "string" ? editorRaw.monacoThemeId : d.editor.monacoThemeId,
        },
        {
          primary: safeHex(accentRaw?.primary, d.accent.primary),
          primaryMuted: safeHex(accentRaw?.primaryMuted, d.accent.primaryMuted),
          selectionBorder: safeHex(accentRaw?.selectionBorder, d.accent.selectionBorder),
          focusRing: safeHex(accentRaw?.focusRing, d.accent.focusRing),
        },
        derivedAiSidebar,
      );
      if (!aiOverlayRaw || typeof aiOverlayRaw !== "object") return derived;
      return {
        panelBg: safeHex(aiOverlayRaw.panelBg, derived.panelBg),
        panelBorder: safeColorOrRgba(aiOverlayRaw.panelBorder, derived.panelBorder),
        headerText: safeHex(aiOverlayRaw.headerText, derived.headerText),
        buttonBg: safeColorOrRgba(aiOverlayRaw.buttonBg, derived.buttonBg),
        buttonText: safeHex(aiOverlayRaw.buttonText, derived.buttonText),
        acceptBg: safeColorOrRgba(aiOverlayRaw.acceptBg, derived.acceptBg),
        acceptText: safeHex(aiOverlayRaw.acceptText, derived.acceptText),
        highlightBg: safeColorOrRgba(aiOverlayRaw.highlightBg, derived.highlightBg),
        highlightActiveBg: safeColorOrRgba(aiOverlayRaw.highlightActiveBg, derived.highlightActiveBg),
        highlightLineBg: safeColorOrRgba(aiOverlayRaw.highlightLineBg, derived.highlightLineBg),
        diffZoneBg: safeHex(aiOverlayRaw.diffZoneBg, derived.diffZoneBg),
        diffZoneBorder: safeColorOrRgba(aiOverlayRaw.diffZoneBorder, derived.diffZoneBorder),
        diffRemovedText: safeHex(aiOverlayRaw.diffRemovedText, derived.diffRemovedText),
        diffAddedText: safeHex(aiOverlayRaw.diffAddedText, derived.diffAddedText),
      };
    })(),
    actionBar: {
      barBg: safeHex(actionBarRaw?.barBg, d.actionBar.barBg),
      buttonBg: safeHex(actionBarRaw?.buttonBg, d.actionBar.buttonBg),
      buttonBorder: safeHex(actionBarRaw?.buttonBorder, d.actionBar.buttonBorder),
      buttonHover: safeHex(actionBarRaw?.buttonHover, d.actionBar.buttonHover),
      buttonText: safeHex(actionBarRaw?.buttonText, d.actionBar.buttonText),
      buttonIcon: safeHex(actionBarRaw?.buttonIcon, d.actionBar.buttonIcon),
      buttonDisabledBg: safeHex(actionBarRaw?.buttonDisabledBg, d.actionBar.buttonDisabledBg),
      buttonDisabledText: safeHex(actionBarRaw?.buttonDisabledText, d.actionBar.buttonDisabledText),
      buttonDisabledIcon: safeHex(actionBarRaw?.buttonDisabledIcon, d.actionBar.buttonDisabledIcon),
      attachIndicatorOn: safeHex(actionBarRaw?.attachIndicatorOn, d.actionBar.attachIndicatorOn),
      attachIndicatorOff: normalizeAttachIndicatorOff(
        safeHex(actionBarRaw?.attachIndicatorOff, d.actionBar.attachIndicatorOff),
        d.actionBar.attachIndicatorOff,
      ),
    },
    icons: {
      color: safeHex(iconsRaw?.color, d.icons.color),
      muted: safeHex(iconsRaw?.muted, d.icons.muted),
    },
    settingsChrome: {
      sectionHeaderBg: safeHex(settingsChromeRaw?.sectionHeaderBg, d.settingsChrome.sectionHeaderBg),
      labelText: safeHex(settingsChromeRaw?.labelText, d.settingsChrome.labelText),
      descriptionText: safeHex(settingsChromeRaw?.descriptionText, d.settingsChrome.descriptionText),
      checkboxOn: safeHex(settingsChromeRaw?.checkboxOn, d.settingsChrome.checkboxOn),
      checkboxOff: safeHex(settingsChromeRaw?.checkboxOff, d.settingsChrome.checkboxOff),
      sidebarActiveBg: safeHex(settingsChromeRaw?.sidebarActiveBg, d.settingsChrome.sidebarActiveBg),
      sidebarAccent: safeHex(settingsChromeRaw?.sidebarAccent, d.settingsChrome.sidebarAccent),
      controlBg: safeHex(settingsChromeRaw?.controlBg, d.settingsChrome.controlBg),
      controlBorder: safeHex(settingsChromeRaw?.controlBorder, d.settingsChrome.controlBorder),
      controlHoverBg: safeHex(settingsChromeRaw?.controlHoverBg, d.settingsChrome.controlHoverBg),
      controlText: safeHex(settingsChromeRaw?.controlText, d.settingsChrome.controlText),
      fieldBg: safeHex(settingsChromeRaw?.fieldBg, d.settingsChrome.fieldBg),
      fieldBorder: safeHex(settingsChromeRaw?.fieldBorder, d.settingsChrome.fieldBorder),
      sidebarIcon: safeHex(settingsChromeRaw?.sidebarIcon, d.settingsChrome.sidebarIcon),
      chipSelectedBorder: safeHex(settingsChromeRaw?.chipSelectedBorder, d.settingsChrome.chipSelectedBorder),
    },
    scriptHub: {
      searchBg: safeHex(scriptHubRaw?.searchBg, d.scriptHub.searchBg),
      searchBorder:
        typeof scriptHubRaw?.searchBorder === "string"
          ? scriptHubRaw.searchBorder
          : d.scriptHub.searchBorder,
      searchText: safeHex(scriptHubRaw?.searchText, d.scriptHub.searchText),
      searchPlaceholder: safeHex(scriptHubRaw?.searchPlaceholder, d.scriptHub.searchPlaceholder),
      toggleDivider:
        typeof scriptHubRaw?.toggleDivider === "string"
          ? scriptHubRaw.toggleDivider
          : typeof scriptHubRaw?.toggleTrackBg === "string"
            ? scriptHubRaw.toggleTrackBg
            : d.scriptHub.toggleDivider,
      toggleIndicator: safeHex(
        typeof scriptHubRaw?.toggleIndicator === "string"
          ? scriptHubRaw.toggleIndicator
          : typeof scriptHubRaw?.toggleActiveBorder === "string"
            ? scriptHubRaw.toggleActiveBorder
            : d.scriptHub.toggleIndicator,
        d.scriptHub.toggleIndicator,
      ),
      toggleActiveText: safeHex(scriptHubRaw?.toggleActiveText, d.scriptHub.toggleActiveText),
      toggleInactiveText: safeHex(scriptHubRaw?.toggleInactiveText, d.scriptHub.toggleInactiveText),
      toggleCustomized: scriptHubRaw?.toggleCustomized === true,
      toggleTrackBg:
        typeof scriptHubRaw?.toggleTrackBg === "string" ? scriptHubRaw.toggleTrackBg : undefined,
      toggleActiveBg:
        typeof scriptHubRaw?.toggleActiveBg === "string" ? scriptHubRaw.toggleActiveBg : undefined,
      toggleActiveBorder:
        typeof scriptHubRaw?.toggleActiveBorder === "string"
          ? scriptHubRaw.toggleActiveBorder
          : undefined,
      cardGlassBg:
        typeof scriptHubRaw?.cardGlassBg === "string" ? scriptHubRaw.cardGlassBg : d.scriptHub.cardGlassBg,
      cardGlassBorder:
        typeof scriptHubRaw?.cardGlassBorder === "string"
          ? scriptHubRaw.cardGlassBorder
          : d.scriptHub.cardGlassBorder,
      cardScrimFrom:
        typeof scriptHubRaw?.cardScrimFrom === "string"
          ? scriptHubRaw.cardScrimFrom
          : d.scriptHub.cardScrimFrom,
      cardTitleText: safeHex(scriptHubRaw?.cardTitleText, d.scriptHub.cardTitleText),
      cardSubtitleText: safeHex(scriptHubRaw?.cardSubtitleText, d.scriptHub.cardSubtitleText),
      cardShadow:
        typeof scriptHubRaw?.cardShadow === "string" ? scriptHubRaw.cardShadow : d.scriptHub.cardShadow,
      cardExecuteBg:
        typeof scriptHubRaw?.cardExecuteBg === "string"
          ? scriptHubRaw.cardExecuteBg
          : d.scriptHub.cardExecuteBg,
      cardExecuteDisabledBg:
        typeof scriptHubRaw?.cardExecuteDisabledBg === "string"
          ? scriptHubRaw.cardExecuteDisabledBg
          : d.scriptHub.cardExecuteDisabledBg,
      cardIconBtnBg:
        typeof scriptHubRaw?.cardIconBtnBg === "string"
          ? scriptHubRaw.cardIconBtnBg
          : d.scriptHub.cardIconBtnBg,
      statusText: safeHex(scriptHubRaw?.statusText, d.scriptHub.statusText),
      errorText: safeHex(scriptHubRaw?.errorText, d.scriptHub.errorText),
      paginationText: safeHex(scriptHubRaw?.paginationText, d.scriptHub.paginationText),
    },
    accent: {
      primary: safeHex(accentRaw?.primary, d.accent.primary),
      primaryMuted: safeHex(accentRaw?.primaryMuted, d.accent.primaryMuted),
      selectionBorder: safeHex(accentRaw?.selectionBorder, d.accent.selectionBorder),
      focusRing: safeHex(accentRaw?.focusRing, d.accent.focusRing),
    },
    overlay: (() => {
      const legacyImage = safeDataUrl(overlayRaw?.imageDataUrl);
      const bgMode = safeBackgroundMode(
        overlayRaw?.backgroundMode,
        legacyImage ? "image" : d.overlay.backgroundMode,
      );
      return {
        backgroundMode: bgMode,
        imageDataUrl: legacyImage,
        hasStoredBackgroundImage: Boolean(overlayRaw?.hasStoredBackgroundImage),
        backgroundImageFilename:
          typeof overlayRaw?.backgroundImageFilename === "string"
            ? overlayRaw.backgroundImageFilename
            : null,
        hasStoredVideo: Boolean(overlayRaw?.hasStoredVideo),
        videoFilename: typeof overlayRaw?.videoFilename === "string" ? overlayRaw.videoFilename : null,
        opacity: safeOpacity(overlayRaw?.opacity, d.overlay.opacity),
        blurPx: safePx(overlayRaw?.blurPx, d.overlay.blurPx, 0, 32),
        mode: overlayRaw?.mode === "top" ? "top" : "behind",
        mediaBlurPx: safePx(overlayRaw?.mediaBlurPx, d.overlay.mediaBlurPx, 0, 32),
        mediaSaturate: safeMediaSaturate(overlayRaw?.mediaSaturate, d.overlay.mediaSaturate),
        position: safePosition(overlayRaw?.position, d.overlay.position),
        pageScrimOpacity: safeOpacity(overlayRaw?.pageScrimOpacity, d.overlay.pageScrimOpacity),
      };
    })(),
    loading: {
      imageDataUrl: safeDataUrl(loadingRaw?.imageDataUrl) ?? d.loading.imageDataUrl,
      hasStoredLoadingImage: Boolean(loadingRaw?.hasStoredLoadingImage),
      loadingImageFilename:
        typeof loadingRaw?.loadingImageFilename === "string"
          ? loadingRaw.loadingImageFilename
          : null,
    },
    typography: {
      uiFontId: typographyRaw?.uiFontId != null
        ? normalizeUiFontId(typographyRaw.uiFontId)
        : d.typography.uiFontId,
      uiFontSizeStep: safePx(typographyRaw?.uiFontSizeStep, d.typography.uiFontSizeStep, 0, 8),
    },
    branding: {
      topBarLogoPreset:
        typeof brandingRaw?.topBarLogoPreset === "string" &&
        isV3BrandingLogoPreset(brandingRaw.topBarLogoPreset)
          ? brandingRaw.topBarLogoPreset
          : d.branding.topBarLogoPreset,
      logoDataUrl: safeDataUrl(brandingRaw?.logoDataUrl),
      logoMode: brandingRaw?.logoMode === "text" ? "text" : "image",
      logoText:
        typeof brandingRaw?.logoText === "string" && brandingRaw.logoText.trim()
          ? brandingRaw.logoText
          : d.branding.logoText,
      logoTextColor: safeHex(brandingRaw?.logoTextColor, d.branding.logoTextColor),
      logoTextFontId:
        brandingRaw?.logoTextFontId != null
          ? normalizeUiFontId(brandingRaw.logoTextFontId)
          : d.branding.logoTextFontId,
      logoTextSizePx: safePx(brandingRaw?.logoTextSizePx, d.branding.logoTextSizePx, 8, 32),
      logoTextWeight: safePx(brandingRaw?.logoTextWeight, d.branding.logoTextWeight, 300, 900),
      logoTextLetterSpacing: safePx(
        brandingRaw?.logoTextLetterSpacing,
        d.branding.logoTextLetterSpacing,
        -2,
        8,
      ),
    },
    simple: {
      presetId: safePresetId(simpleRaw?.presetId),
      accentHex: safeHex(simpleRaw?.accentHex, d.simple.accentHex),
      darkness: safePx(simpleRaw?.darkness, d.simple.darkness, 0, 100),
      contrast: safePx(simpleRaw?.contrast, d.simple.contrast, 0, 100),
    },
  };

  const synced = syncScriptHubToggleFromAccent(theme);
  return synced;
}

function dispatchChange(): void {
  try {
    window.dispatchEvent(new Event(V3_THEME_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function readV3Theme(): V3ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_V3_THEME);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized = normalizeV3Theme(parsed);
    const parsedHub = parsed.scriptHub as Record<string, unknown> | undefined;
    if (
      parsedHub &&
      (typeof parsedHub.toggleActiveBg === "string" ||
        typeof parsedHub.toggleIndicator !== "string" ||
        parsedHub.toggleIndicator !== normalized.scriptHub.toggleIndicator)
    ) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        /* ignore */
      }
    }
    return normalized;
  } catch {
    return structuredClone(DEFAULT_V3_THEME);
  }
}

export function writeV3Theme(partial: Partial<V3ThemeState> & {
  shell?: Partial<V3ThemeShell>;
  topBar?: Partial<V3ThemeTopBar>;
  editor?: Partial<V3ThemeEditor>;
  scriptList?: Partial<V3ThemeScriptList>;
  aiSidebar?: Partial<V3ThemeAiSidebar>;
  aiOverlay?: Partial<V3ThemeAiOverlay>;
  scriptHub?: Partial<V3ThemeScriptHub>;
  actionBar?: Partial<V3ThemeActionBar>;
  icons?: Partial<V3ThemeIcons>;
  settingsChrome?: Partial<V3ThemeSettingsChrome>;
  accent?: Partial<V3ThemeAccent>;
  overlay?: Partial<V3ThemeOverlay>;
  loading?: Partial<V3ThemeLoading>;
  typography?: Partial<V3ThemeTypography>;
  branding?: Partial<V3ThemeBranding>;
  simple?: Partial<V3ThemeSimple>;
}): V3ThemeState {
  const cur = readV3Theme();
  const merged: V3ThemeState = {
    ...cur,
    ...partial,
    shell: { ...cur.shell, ...partial.shell },
    topBar: { ...cur.topBar, ...partial.topBar },
    editor: { ...cur.editor, ...partial.editor },
    scriptList: { ...cur.scriptList, ...partial.scriptList },
    aiSidebar: { ...cur.aiSidebar, ...partial.aiSidebar },
    aiOverlay: { ...cur.aiOverlay, ...partial.aiOverlay },
    scriptHub: { ...cur.scriptHub, ...partial.scriptHub },
    actionBar: { ...cur.actionBar, ...partial.actionBar },
    icons: { ...cur.icons, ...partial.icons },
    settingsChrome: { ...cur.settingsChrome, ...partial.settingsChrome },
    accent: { ...cur.accent, ...partial.accent },
    overlay: { ...cur.overlay, ...partial.overlay },
    loading: { ...cur.loading, ...partial.loading },
    typography: { ...cur.typography, ...partial.typography },
    branding: { ...cur.branding, ...partial.branding },
    simple: { ...cur.simple, ...partial.simple },
  };
  const next = normalizeV3Theme(merged);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  dispatchChange();
  return next;
}

export function applyFullV3Theme(theme: V3ThemeState): V3ThemeState {
  const next = normalizeV3Theme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  dispatchChange();
  return next;
}

export function resetV3Theme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  dispatchChange();
}

/** React hook: live V3 theme synced via events + storage. */
export function useV3Theme(): V3ThemeState {
  const [theme, setTheme] = useState<V3ThemeState>(() => readV3Theme());

  useEffect(() => {
    const sync = () => setTheme(readV3Theme());
    window.addEventListener(V3_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(V3_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return theme;
}

/** @deprecated Legacy flat fields — map from nested state for any old imports. */
export type LegacyV3ThemeFlat = {
  bg: string;
  panelBg: string;
  text: string;
  textMuted: string;
  accent: string;
};

export function v3ThemeToLegacyFlat(t: V3ThemeState): LegacyV3ThemeFlat {
  return {
    bg: t.shell.pageBg,
    panelBg: t.scriptList.sectionHeaderBg,
    text: t.topBar.text,
    textMuted: t.topBar.mutedText,
    accent: t.accent.primary,
  };
}
