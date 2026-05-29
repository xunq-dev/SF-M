import type { CSSProperties } from "react";
import { isTopBarLogoPresetId, type TopBarLogoPresetId } from "./topBarLogos";
import { PROGRESS_BAR_FILL, SHELL_BG } from "./shell";
import {
  DEFAULT_EDITOR_THEME_ID,
  isAllowedEditorThemeId,
  normalizeEditorMonacoThemeId,
} from "../editor/editorThemeAllowlist";
import { normalizeUiFontId, type UiFontId } from "./uiFontStacks";
import {
  idbDeleteBackgroundImage,
  idbDeleteBackgroundVideo,
  idbDeleteConfirmationBackgroundImage,
  idbDeleteInitBackgroundImage,
  idbDeleteInitBackgroundVideo,
  idbGetBackgroundImage,
  idbGetBackgroundVideo,
  idbGetConfirmationBackgroundImage,
  idbGetInitBackgroundImage,
  idbGetInitBackgroundVideo,
  idbPutBackgroundImage,
  idbPutBackgroundVideo,
  idbPutConfirmationBackgroundImage,
  idbPutInitBackgroundImage,
  idbPutInitBackgroundVideo,
} from "./idbVideo";

export const SHELL_THEME_STORAGE_KEY = "synapseOriginal.shellTheme";
export const SHELL_THEME_CHANGED_EVENT = "synapseOriginal:shell-theme-changed";

/** Integer px added to each `text-[Npx]` font-size (see `shell-text-scale.css`); layout px unchanged. */
export const UI_FONT_SIZE_STEP_MIN = -3;
export const UI_FONT_SIZE_STEP_MAX = 3;

/** Background images are stored as blobs in IndexedDB (not localStorage). */
export const MAX_BACKGROUND_IMAGE_BYTES = 24 * 1_024 * 1_024;
/** MP4 / video backgrounds — unchanged cap */
export const MAX_BACKGROUND_VIDEO_BYTES = 40 * 1_024 * 1_024;
export const MAX_LOGO_BYTES = 350_000;

/** Legacy key; migrated into `editorMonacoThemeId` on first normalize. */
const LEGACY_EDITOR_THEME_STORAGE_KEY = "synapseOriginal.editorTheme";

export type BackgroundMode = "none" | "image" | "video";
export type BackgroundLayer = "integrated" | "above";

/** Above UI draws an opaque film over routes; 1 would hide everything, so opacity is capped. */
export const MAX_ABOVE_UI_BACKGROUND_OPACITY = 0.7;

/** Rounded outer shell / desktop window chrome (0 = square). */
export const WINDOW_CORNER_RADIUS_MAX_PX = 20;

/** Sidebar nav pill corner radius (0 = full-width legacy cells). */
export const SIDEBAR_NAV_BUTTON_RADIUS_MAX_PX = 16;
/** Concave joint depth for top/bottom of the active pill (0 = off). */
export const SIDEBAR_NAV_NOTCH_MAX_PX = 14;
/** Horizontal width of the curved notch transition (higher = smoother, gentler curves). */
export const SIDEBAR_NAV_NOTCH_SPREAD_MAX_PX = 20;
/** Depth of concave scoops on the active pill’s right edge (toward page content). */
export const SIDEBAR_NAV_TRAILING_NOTCH_MAX_PX = 14;
/** Vertical span of each right-edge scoop (clamped by cell height at runtime). */
export const SIDEBAR_NAV_TRAILING_SPAN_MAX_PX = 22;
export const SIDEBAR_NAV_PILL_INSET_H_MAX_PX = 14;
export const SIDEBAR_NAV_PILL_INSET_V_MAX_PX = 12;
export const SIDEBAR_NAV_ICON_STROKE_WIDTH_MAX = 3;
/** Vertical gap (px) between stacked 64px-tall sidebar nav cells. */
export const SIDEBAR_NAV_CELL_GAP_MAX_PX = 48;

function clampWindowCornerRadiusPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(WINDOW_CORNER_RADIUS_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampPx(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.round(raw)));
}

function clampSidebarNavButtonRadiusPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_BUTTON_RADIUS_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampSidebarNavNotchDepthPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_NOTCH_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampSidebarNavNotchSpreadPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_NOTCH_SPREAD_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampSidebarNavTrailingNotchPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_TRAILING_NOTCH_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampSidebarNavTrailingSpanPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_TRAILING_SPAN_MAX_PX, Math.max(0, Math.round(raw)));
}

function clampSidebarNavPillInsetHPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_PILL_INSET_H_MAX_PX, Math.max(2, Math.round(raw)));
}

function clampSidebarNavPillInsetVPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_PILL_INSET_V_MAX_PX, Math.max(2, Math.round(raw)));
}

function clampSidebarNavIconStrokeWidthPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(
    SIDEBAR_NAV_ICON_STROKE_WIDTH_MAX,
    Math.max(1, Math.round(raw * 2) / 2),
  );
}

function clampSidebarNavCellGapPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SIDEBAR_NAV_CELL_GAP_MAX_PX, Math.max(0, Math.round(raw)));
}

export type InitBackgroundMode = "none" | "image" | "video";

export type InitLoadingStepCopy = {
  title: string;
  descriptionLine1: string;
  descriptionLine2: string;
};

export const SHELL_HOVER_ROUTE_PATHS = [
  "/",
  "/script-hub",
  "/console",
  "/settings",
  "/themes",
] as const;
export type ShellHoverRoutePath = (typeof SHELL_HOVER_ROUTE_PATHS)[number];

export type ShellHoverTooltipCopy = {
  title: string;
  descriptionLine1: string;
  descriptionLine2: string;
};

export type ShellHoverTooltipsState = Record<ShellHoverRoutePath, ShellHoverTooltipCopy>;

export type EditorChromeLabelsState = {
  editorPageTitle: string;
  editorButtonExecute: string;
  editorButtonClear: string;
  editorButtonOpenFile: string;
  editorButtonExecuteFile: string;
  editorButtonSaveFile: string;
  editorButtonAttach: string;
};

export type AttachOverlayStepCopy = {
  title: string;
  description: string;
};

/** Colours and copy for the attach-session progress notch, bar, dots, and step card. */
export type AttachOverlayThemeState = {
  /** Horizontal bar animation length */
  barDurationMs: number;
  notchFrom: string;
  notchTo: string;
  /** Filled portion of the progress track */
  barFill: string;
  trackFill: string;
  /** 0–1 opacity on track behind the bar */
  trackOpacity: number;
  dotStroke: string;
  dotInactive: string;
  dotActive: string;
  dotComplete: string;
  stepCardFrom: string;
  stepCardTo: string;
  stepTitleColor: string;
  stepBodyColor: string;
  steps: [AttachOverlayStepCopy, AttachOverlayStepCopy, AttachOverlayStepCopy];
};

/** Script Hub route + embedded ScriptBlox browser (cards, search, secondary nav). */
export type ScriptHubThemeState = {
  /** Card outer corner radius in px (0–24). */
  cardRadiusPx: number;
  cardBorderColor: string;
  cardBackground: string;
  /** Solid fill when game/thumbnail image fails to load. */
  thumbFallbackBg: string;
  titleColor: string;
  subtitleColor: string;
  searchBackground: string;
  searchBorder: string;
  searchFocusBorder: string;
  ctaBackground: string;
  ctaHoverBackground: string;
  ctaBorder: string;
  secondaryFrom: string;
  secondaryTo: string;
  secondaryBorder: string;
  secondaryText: string;
};

export const DEFAULT_SCRIPT_HUB_THEME: ScriptHubThemeState = {
  cardRadiusPx: 8,
  cardBorderColor: "#3a3a3a",
  cardBackground: "#191919",
  thumbFallbackBg: "#454545",
  titleColor: "#ffffff",
  subtitleColor: "#8a8a8e",
  searchBackground: "#191919",
  searchBorder: "#606060",
  searchFocusBorder: "#3149e8",
  ctaBackground: "#3149e8",
  ctaHoverBackground: "#2a40d4",
  ctaBorder: "#4a5ed8",
  secondaryFrom: "#494949",
  secondaryTo: "#404040",
  secondaryBorder: "#606060",
  secondaryText: "#c3c3c3",
};

export type InitScreenThemeState = {
  shellBg: string;
  headerFrom: string;
  headerTo: string;
  progressBar: string;
  /** Track behind the vertical progress fill */
  progressTrackBackground: string;
  stepPanelFrom: string;
  stepPanelTo: string;
  /** Step row dots — before the bar reaches them */
  stepDotInactive: string;
  /** Step row dots — after the bar reaches them */
  stepDotActive: string;
  /** Ring stroke around each step dot */
  stepDotStroke: string;
  /** Main headings (tagline, “Initializing…”, step card titles) */
  textPrimary: string;
  /** Subcopy (“This won’t take long.”, step descriptions) */
  textSecondary: string;
  backgroundMode: InitBackgroundMode;
  backgroundImageDataUrl: string | null;
  backgroundImageFilename: string | null;
  /** When true, init background image bytes live in IndexedDB, not `backgroundImageDataUrl`. */
  hasStoredBackgroundImage: boolean;
  hasStoredVideo: boolean;
  backgroundVideoFilename: string | null;
  /** 0–1 opacity on init background image/video */
  backgroundOpacity: number;
  backgroundPosition: { x: number; y: number };
  loadingSteps: [InitLoadingStepCopy, InitLoadingStepCopy, InitLoadingStepCopy];
};

const DEFAULT_INIT_LOADING_STEPS: [
  InitLoadingStepCopy,
  InitLoadingStepCopy,
  InitLoadingStepCopy,
] = [
  {
    title: "Checking Status",
    descriptionLine1: "We are checking for an active",
    descriptionLine2: "WebSocket connection to your executor.",
  },
  {
    title: "Checking For Updates",
    descriptionLine1: "Run Websocket Bridge.lua in your executor to connect",
    descriptionLine2: "the WebSocket bridge.",
  },
  {
    title: "Initialization Complete",
    descriptionLine1: "Thank you for your patience, enjoy using",
    descriptionLine2: "Synapse Framework",
  },
];

export const DEFAULT_EDITOR_CHROME_LABELS: EditorChromeLabelsState = {
  editorPageTitle: "Execution",
  editorButtonExecute: "Execute",
  editorButtonClear: "Clear",
  editorButtonOpenFile: "Open File",
  editorButtonExecuteFile: "Execute File",
  editorButtonSaveFile: "Save File",
  editorButtonAttach: "Attach",
};

export const DEFAULT_SHELL_HOVER_TOOLTIPS: ShellHoverTooltipsState = {
  "/": {
    title: "Execution",
    descriptionLine1: "Create and run scripts in the current",
    descriptionLine2: "instance.",
  },
  "/script-hub": {
    title: "Script Hub",
    descriptionLine1: "Execute pre-made scripts by the community",
    descriptionLine2: "and ScriptBlox",
  },
  "/console": {
    title: "Console",
    descriptionLine1: "Integrated Synapse console.",
    descriptionLine2: "",
  },
  "/settings": {
    title: "Options",
    descriptionLine1: "Tweak various preferences that modify",
    descriptionLine2: "Synapse.",
  },
  "/themes": {
    title: "Theme Control Panel",
    descriptionLine1: "Customise your theming with precise and",
    descriptionLine2: "clear control",
  },
};

const DEFAULT_ATTACH_STEPS: [
  AttachOverlayStepCopy,
  AttachOverlayStepCopy,
  AttachOverlayStepCopy,
] = [
  { title: "instance Check", description: "Checking for instances." },
  { title: "Validating Data", description: "Checking a few things." },
  { title: "Injecting", description: "Injecting Synapse Framework." },
];

export const DEFAULT_ATTACH_OVERLAY_THEME: AttachOverlayThemeState = {
  barDurationMs: 3000,
  notchFrom: "#716f73",
  notchTo: "#787a7e",
  barFill: PROGRESS_BAR_FILL,
  trackFill: "#383838",
  trackOpacity: 0.68,
  dotStroke: "#585858",
  dotInactive: "#414141",
  dotActive: "#3149e8",
  dotComplete: "#2dbd6f",
  stepCardFrom: "#324dd8",
  stepCardTo: "#3344a3",
  stepTitleColor: "#ffffff",
  stepBodyColor: "#ffffff",
  steps: [
    { ...DEFAULT_ATTACH_STEPS[0] },
    { ...DEFAULT_ATTACH_STEPS[1] },
    { ...DEFAULT_ATTACH_STEPS[2] },
  ],
};

export const DEFAULT_INIT_THEME: InitScreenThemeState = {
  shellBg: SHELL_BG,
  headerFrom: "#233da3",
  headerTo: "#323f89",
  progressBar: PROGRESS_BAR_FILL,
  progressTrackBackground: "#383838",
  stepPanelFrom: "#324dd8",
  stepPanelTo: "#3344a3",
  stepDotInactive: "#414141",
  stepDotActive: "#3149E8",
  stepDotStroke: "#585858",
  textPrimary: "#ffffff",
  textSecondary: "#ffffff",
  backgroundMode: "none",
  backgroundImageDataUrl: null,
  backgroundImageFilename: null,
  hasStoredBackgroundImage: false,
  hasStoredVideo: false,
  backgroundVideoFilename: null,
  backgroundOpacity: 1,
  backgroundPosition: { x: 50, y: 50 },
  loadingSteps: [
    { ...DEFAULT_INIT_LOADING_STEPS[0] },
    { ...DEFAULT_INIT_LOADING_STEPS[1] },
    { ...DEFAULT_INIT_LOADING_STEPS[2] },
  ],
};

/** Editor Clear / close-all confirmation dialogs (separate Tauri windows when enabled). */
export type ConfirmationBackgroundMode = "none" | "image";

export type ConfirmationDialogThemeState = {
  panelBg: string;
  topBarFrom: string;
  topBarTo: string;
  titleColor: string;
  bodyColor: string;
  iconStroke: string;
  noButtonFrom: string;
  noButtonTo: string;
  noButtonBorder: string;
  noButtonText: string;
  yesButtonFrom: string;
  yesButtonTo: string;
  yesButtonBorder: string;
  yesButtonText: string;
  windowWidthPx: number;
  windowHeightPx: number;
  clearCurrentTitle: string;
  clearCurrentBodyLine1: string;
  clearCurrentBodyLine2: string;
  closeAllTitle: string;
  closeAllBodyLine1: string;
  closeAllBodyLine2: string;
  closeTabTitle: string;
  closeTabBodyLine1: string;
  closeTabBodyLine2: string;
  backgroundMode: ConfirmationBackgroundMode;
  backgroundImageDataUrl: string | null;
  backgroundImageFilename: string | null;
  hasStoredBackgroundImage: boolean;
  backgroundOpacity: number;
  backgroundPosition: { x: number; y: number };
};

export const DEFAULT_CONFIRMATION_THEME: ConfirmationDialogThemeState = {
  panelBg: "#323232",
  topBarFrom: "#233da4",
  topBarTo: "#323f89",
  titleColor: "#ffffff",
  bodyColor: "#ffffff",
  iconStroke: "#ffffff",
  noButtonFrom: "#494949",
  noButtonTo: "#404040",
  noButtonBorder: "#606060",
  noButtonText: "#c3c3c3",
  yesButtonFrom: "#2d4191",
  yesButtonTo: "#233ea6",
  yesButtonBorder: "#606060",
  yesButtonText: "#c3c3c3",
  windowWidthPx: 540,
  windowHeightPx: 264,
  clearCurrentTitle: "Synapse Warning",
  clearCurrentBodyLine1: "Are you sure you want to clear this tab?",
  clearCurrentBodyLine2: "All unsaved changes in the current script will be lost!",
  closeAllTitle: "Synapse Warning",
  closeAllBodyLine1: "Are you sure you want to clear the editor?",
  closeAllBodyLine2: "All open script tabs will be replaced with a single empty tab.",
  closeTabTitle: "Synapse Warning",
  closeTabBodyLine1: "Close this script tab?",
  closeTabBodyLine2: "Unsaved changes in this tab will be lost.",
  backgroundMode: "none",
  backgroundImageDataUrl: null,
  backgroundImageFilename: null,
  hasStoredBackgroundImage: false,
  backgroundOpacity: 1,
  backgroundPosition: { x: 50, y: 50 },
};

/**
 * Shared route chrome: editor script list, Monaco surround, console panel, and similar raised UI.
 * One palette keeps Script Hub cards separate (`scriptHubTheme`) while unifying in-app utility surfaces.
 */
export type SurfaceElementsThemeState = {
  editorWorkAreaBackground: string;
  surfacePanelBackground: string;
  surfacePanelBorder: string;
  surfaceHeaderBackground: string;
  surfaceHeaderBorder: string;
  surfaceHeaderText: string;
  surfaceListDivider: string;
  surfaceListText: string;
  surfaceListHoverBackground: string;
  surfaceListFocusRing: string;
  surfaceSearchBackground: string;
  surfaceSearchPlaceholder: string;
  surfaceSectionIcon: string;
  surfaceRowMutedText: string;
};

export const DEFAULT_SURFACE_ELEMENTS_THEME: SurfaceElementsThemeState = {
  editorWorkAreaBackground: "#2d2d2d",
  surfacePanelBackground: "#2a2a2a",
  surfacePanelBorder: "#1e1e1e",
  surfaceHeaderBackground: "#323232",
  surfaceHeaderBorder: "#1a1a1a",
  surfaceHeaderText: "#a8a8a8",
  surfaceListDivider: "#333333",
  surfaceListText: "#d0d0d0",
  surfaceListHoverBackground: "#353535",
  surfaceListFocusRing: "#6a8fff",
  surfaceSearchBackground: "#2d2d2d",
  surfaceSearchPlaceholder: "#6f6f6e",
  surfaceSectionIcon: "#868686",
  surfaceRowMutedText: "#5a5a5a",
};

function normalizeSurfaceElementsTheme(
  raw: unknown,
  defaults: SurfaceElementsThemeState,
): SurfaceElementsThemeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  return {
    editorWorkAreaBackground: sanitizeHex(
      String(o.editorWorkAreaBackground ?? defaults.editorWorkAreaBackground),
      defaults.editorWorkAreaBackground,
    ),
    surfacePanelBackground: sanitizeHex(
      String(o.surfacePanelBackground ?? defaults.surfacePanelBackground),
      defaults.surfacePanelBackground,
    ),
    surfacePanelBorder: sanitizeHex(
      String(o.surfacePanelBorder ?? defaults.surfacePanelBorder),
      defaults.surfacePanelBorder,
    ),
    surfaceHeaderBackground: sanitizeHex(
      String(o.surfaceHeaderBackground ?? defaults.surfaceHeaderBackground),
      defaults.surfaceHeaderBackground,
    ),
    surfaceHeaderBorder: sanitizeHex(
      String(o.surfaceHeaderBorder ?? defaults.surfaceHeaderBorder),
      defaults.surfaceHeaderBorder,
    ),
    surfaceHeaderText: sanitizeHex(
      String(o.surfaceHeaderText ?? defaults.surfaceHeaderText),
      defaults.surfaceHeaderText,
    ),
    surfaceListDivider: sanitizeHex(
      String(o.surfaceListDivider ?? defaults.surfaceListDivider),
      defaults.surfaceListDivider,
    ),
    surfaceListText: sanitizeHex(String(o.surfaceListText ?? defaults.surfaceListText), defaults.surfaceListText),
    surfaceListHoverBackground: sanitizeHex(
      String(o.surfaceListHoverBackground ?? defaults.surfaceListHoverBackground),
      defaults.surfaceListHoverBackground,
    ),
    surfaceListFocusRing: sanitizeHex(
      String(o.surfaceListFocusRing ?? defaults.surfaceListFocusRing),
      defaults.surfaceListFocusRing,
    ),
    surfaceSearchBackground: sanitizeHex(
      String(o.surfaceSearchBackground ?? defaults.surfaceSearchBackground),
      defaults.surfaceSearchBackground,
    ),
    surfaceSearchPlaceholder: sanitizeHex(
      String(o.surfaceSearchPlaceholder ?? defaults.surfaceSearchPlaceholder),
      defaults.surfaceSearchPlaceholder,
    ),
    surfaceSectionIcon: sanitizeHex(
      String(o.surfaceSectionIcon ?? defaults.surfaceSectionIcon),
      defaults.surfaceSectionIcon,
    ),
    surfaceRowMutedText: sanitizeHex(
      String(o.surfaceRowMutedText ?? defaults.surfaceRowMutedText),
      defaults.surfaceRowMutedText,
    ),
  };
}

function clipToolPanelShadow(s: unknown, fallback: string): string {
  if (typeof s !== "string" || !s.trim()) return fallback;
  const t = s.trim();
  return t.length > 220 ? t.slice(0, 220) : t;
}

/**
 * Options page, Theme Control panel, and shared tool chrome (cards, tabs, chips).
 * Consumed via `toolPanelCssVars` on a wrapper so routes can use `var(--tp-*)` in Tailwind.
 */
export type ToolPanelsThemeState = {
  pageHeaderBorder: string;
  pageTitle: string;
  pageSubtitle: string;
  cardBackground: string;
  cardBorder: string;
  cardTitle: string;
  cardHint: string;
  cardBoxShadow: string;
  sectionBackground: string;
  sectionBorder: string;
  sectionTitle: string;
  sectionBody: string;
  sectionInsetShadow: string;
  tabsListBackground: string;
  tabsListBorder: string;
  tabInactiveText: string;
  tabActiveBackground: string;
  tabActiveText: string;
  tabHoverBackground: string;
  toolbarButtonBorder: string;
  toolbarButtonBackground: string;
  toolbarButtonHoverBackground: string;
  toolbarButtonText: string;
  linkText: string;
  linkDecoration: string;
  linkHoverText: string;
  sliderTrackBackground: string;
  sliderRangeBackground: string;
  browseButtonBorder: string;
  browseButtonBackground: string;
  browseButtonHoverBackground: string;
  browseButtonText: string;
  fieldBorder: string;
  fieldBackground: string;
  fieldText: string;
  fieldPlaceholder: string;
  fieldFocusBorder: string;
  chipSelectedBorder: string;
  chipSelectedBackground: string;
  chipInactiveBorder: string;
  chipInactiveBackground: string;
  chipInactiveHoverBackground: string;
  chipTitleText: string;
  chipMutedText: string;
  colorWellBorder: string;
  colorWellBackground: string;
};

export const DEFAULT_TOOL_PANELS_THEME: ToolPanelsThemeState = {
  pageHeaderBorder: "#3d3d3d",
  pageTitle: "#f0f0f0",
  pageSubtitle: "#a8a8a8",
  cardBackground: "#2f2f2f",
  cardBorder: "#464646",
  cardTitle: "#ffffff",
  cardHint: "#b8b8b8",
  cardBoxShadow: "2px 2px 0 rgba(0,0,0,0.2)",
  sectionBackground: "#2c2c2c",
  sectionBorder: "#424242",
  sectionTitle: "#e8e8e8",
  sectionBody: "#a0a0a0",
  sectionInsetShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  tabsListBackground: "#2a2a2a",
  tabsListBorder: "#464646",
  tabInactiveText: "#c8c8c8",
  tabActiveBackground: "#404040",
  tabActiveText: "#ffffff",
  tabHoverBackground: "#353535",
  toolbarButtonBorder: "#5a5a5a",
  toolbarButtonBackground: "#3d3d3d",
  toolbarButtonHoverBackground: "#4a4a4a",
  toolbarButtonText: "#ffffff",
  linkText: "#9ec0ff",
  linkDecoration: "#5a7ab8",
  linkHoverText: "#ffffff",
  sliderTrackBackground: "#4a4a4a",
  sliderRangeBackground: "#3149E8",
  browseButtonBorder: "#6a6a6a",
  browseButtonBackground: "#c0c0c0",
  browseButtonHoverBackground: "#d4d4d4",
  browseButtonText: "#222222",
  fieldBorder: "#555555",
  fieldBackground: "#1e1e1e",
  fieldText: "#ffffff",
  fieldPlaceholder: "#5a5a5a",
  fieldFocusBorder: "#6a8fff",
  chipSelectedBorder: "#5a7ab8",
  chipSelectedBackground: "#3d4558",
  chipInactiveBorder: "#555555",
  chipInactiveBackground: "#3a3a3a",
  chipInactiveHoverBackground: "#454545",
  chipTitleText: "#c8c8c8",
  chipMutedText: "#888888",
  colorWellBorder: "#555555",
  colorWellBackground: "#4a4a4a",
};

export function normalizeToolPanelsTheme(
  raw: unknown,
  defaults: ToolPanelsThemeState,
): ToolPanelsThemeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  const s = (k: keyof ToolPanelsThemeState) => String(o[k] ?? defaults[k]);
  return {
    pageHeaderBorder: sanitizeHex(s("pageHeaderBorder"), defaults.pageHeaderBorder),
    pageTitle: sanitizeHex(s("pageTitle"), defaults.pageTitle),
    pageSubtitle: sanitizeHex(s("pageSubtitle"), defaults.pageSubtitle),
    cardBackground: sanitizeHex(s("cardBackground"), defaults.cardBackground),
    cardBorder: sanitizeHex(s("cardBorder"), defaults.cardBorder),
    cardTitle: sanitizeHex(s("cardTitle"), defaults.cardTitle),
    cardHint: sanitizeHex(s("cardHint"), defaults.cardHint),
    cardBoxShadow: clipToolPanelShadow(o.cardBoxShadow, defaults.cardBoxShadow),
    sectionBackground: sanitizeHex(s("sectionBackground"), defaults.sectionBackground),
    sectionBorder: sanitizeHex(s("sectionBorder"), defaults.sectionBorder),
    sectionTitle: sanitizeHex(s("sectionTitle"), defaults.sectionTitle),
    sectionBody: sanitizeHex(s("sectionBody"), defaults.sectionBody),
    sectionInsetShadow: clipToolPanelShadow(o.sectionInsetShadow, defaults.sectionInsetShadow),
    tabsListBackground: sanitizeHex(s("tabsListBackground"), defaults.tabsListBackground),
    tabsListBorder: sanitizeHex(s("tabsListBorder"), defaults.tabsListBorder),
    tabInactiveText: sanitizeHex(s("tabInactiveText"), defaults.tabInactiveText),
    tabActiveBackground: sanitizeHex(s("tabActiveBackground"), defaults.tabActiveBackground),
    tabActiveText: sanitizeHex(s("tabActiveText"), defaults.tabActiveText),
    tabHoverBackground: sanitizeHex(s("tabHoverBackground"), defaults.tabHoverBackground),
    toolbarButtonBorder: sanitizeHex(s("toolbarButtonBorder"), defaults.toolbarButtonBorder),
    toolbarButtonBackground: sanitizeHex(s("toolbarButtonBackground"), defaults.toolbarButtonBackground),
    toolbarButtonHoverBackground: sanitizeHex(
      s("toolbarButtonHoverBackground"),
      defaults.toolbarButtonHoverBackground,
    ),
    toolbarButtonText: sanitizeHex(s("toolbarButtonText"), defaults.toolbarButtonText),
    linkText: sanitizeHex(s("linkText"), defaults.linkText),
    linkDecoration: sanitizeHex(s("linkDecoration"), defaults.linkDecoration),
    linkHoverText: sanitizeHex(s("linkHoverText"), defaults.linkHoverText),
    sliderTrackBackground: sanitizeHex(s("sliderTrackBackground"), defaults.sliderTrackBackground),
    sliderRangeBackground: sanitizeHex(s("sliderRangeBackground"), defaults.sliderRangeBackground),
    browseButtonBorder: sanitizeHex(s("browseButtonBorder"), defaults.browseButtonBorder),
    browseButtonBackground: sanitizeHex(s("browseButtonBackground"), defaults.browseButtonBackground),
    browseButtonHoverBackground: sanitizeHex(
      s("browseButtonHoverBackground"),
      defaults.browseButtonHoverBackground,
    ),
    browseButtonText: sanitizeHex(s("browseButtonText"), defaults.browseButtonText),
    fieldBorder: sanitizeHex(s("fieldBorder"), defaults.fieldBorder),
    fieldBackground: sanitizeHex(s("fieldBackground"), defaults.fieldBackground),
    fieldText: sanitizeHex(s("fieldText"), defaults.fieldText),
    fieldPlaceholder: sanitizeHex(s("fieldPlaceholder"), defaults.fieldPlaceholder),
    fieldFocusBorder: sanitizeHex(s("fieldFocusBorder"), defaults.fieldFocusBorder),
    chipSelectedBorder: sanitizeHex(s("chipSelectedBorder"), defaults.chipSelectedBorder),
    chipSelectedBackground: sanitizeHex(s("chipSelectedBackground"), defaults.chipSelectedBackground),
    chipInactiveBorder: sanitizeHex(s("chipInactiveBorder"), defaults.chipInactiveBorder),
    chipInactiveBackground: sanitizeHex(s("chipInactiveBackground"), defaults.chipInactiveBackground),
    chipInactiveHoverBackground: sanitizeHex(
      s("chipInactiveHoverBackground"),
      defaults.chipInactiveHoverBackground,
    ),
    chipTitleText: sanitizeHex(s("chipTitleText"), defaults.chipTitleText),
    chipMutedText: sanitizeHex(s("chipMutedText"), defaults.chipMutedText),
    colorWellBorder: sanitizeHex(s("colorWellBorder"), defaults.colorWellBorder),
    colorWellBackground: sanitizeHex(s("colorWellBackground"), defaults.colorWellBackground),
  };
}

/** CSS custom properties for tool routes — spread onto a root `style` object. */
export function toolPanelCssVars(tp: ToolPanelsThemeState): Record<string, string> {
  return {
    "--tp-page-header-border": tp.pageHeaderBorder,
    "--tp-page-title": tp.pageTitle,
    "--tp-page-subtitle": tp.pageSubtitle,
    "--tp-card-bg": tp.cardBackground,
    "--tp-card-border": tp.cardBorder,
    "--tp-card-title": tp.cardTitle,
    "--tp-card-hint": tp.cardHint,
    "--tp-card-shadow": tp.cardBoxShadow,
    "--tp-section-bg": tp.sectionBackground,
    "--tp-section-border": tp.sectionBorder,
    "--tp-section-title": tp.sectionTitle,
    "--tp-section-body": tp.sectionBody,
    "--tp-section-inset-shadow": tp.sectionInsetShadow,
    "--tp-tabs-list-bg": tp.tabsListBackground,
    "--tp-tabs-list-border": tp.tabsListBorder,
    "--tp-tab-inactive-text": tp.tabInactiveText,
    "--tp-tab-active-bg": tp.tabActiveBackground,
    "--tp-tab-active-text": tp.tabActiveText,
    "--tp-tab-hover-bg": tp.tabHoverBackground,
    "--tp-toolbar-btn-border": tp.toolbarButtonBorder,
    "--tp-toolbar-btn-bg": tp.toolbarButtonBackground,
    "--tp-toolbar-btn-hover-bg": tp.toolbarButtonHoverBackground,
    "--tp-toolbar-btn-text": tp.toolbarButtonText,
    "--tp-link-text": tp.linkText,
    "--tp-link-decoration": tp.linkDecoration,
    "--tp-link-hover-text": tp.linkHoverText,
    "--tp-slider-track": tp.sliderTrackBackground,
    "--tp-slider-range": tp.sliderRangeBackground,
    "--tp-browse-border": tp.browseButtonBorder,
    "--tp-browse-bg": tp.browseButtonBackground,
    "--tp-browse-hover-bg": tp.browseButtonHoverBackground,
    "--tp-browse-text": tp.browseButtonText,
    "--tp-field-border": tp.fieldBorder,
    "--tp-field-bg": tp.fieldBackground,
    "--tp-field-text": tp.fieldText,
    "--tp-field-placeholder": tp.fieldPlaceholder,
    "--tp-field-focus-border": tp.fieldFocusBorder,
    "--tp-chip-sel-border": tp.chipSelectedBorder,
    "--tp-chip-sel-bg": tp.chipSelectedBackground,
    "--tp-chip-border": tp.chipInactiveBorder,
    "--tp-chip-bg": tp.chipInactiveBackground,
    "--tp-chip-hover-bg": tp.chipInactiveHoverBackground,
    "--tp-chip-title": tp.chipTitleText,
    "--tp-chip-muted": tp.chipMutedText,
    "--tp-color-well-border": tp.colorWellBorder,
    "--tp-color-well-bg": tp.colorWellBackground,
  };
}

export type IntegratedPageChromeMode = "opaque" | "translucent" | "glass" | "blur";

export type IntegratedPageChromeState = {
  mode: IntegratedPageChromeMode;
  /** 0–1 tint strength for the route column over integrated wallpaper */
  pageSurfaceOpacity: number;
  /** Max backdrop-filter blur radius (px); glass/blur modes use this before blur mix. */
  pageBackdropBlurPx: number;
  /** 0–1 scales effective blur (reduces frosted blur without changing tint). */
  pageBackdropBlurMix: number;
  /** 0–1 opacity for route content (editor, Themes, Options panels) over the integrated column. */
  pageRouteSurfacesOpacity: number;
};

export const DEFAULT_INTEGRATED_PAGE_CHROME: IntegratedPageChromeState = {
  mode: "translucent",
  pageSurfaceOpacity: 0.88,
  pageBackdropBlurPx: 12,
  pageBackdropBlurMix: 1,
  pageRouteSurfacesOpacity: 1,
};

function clampIntegratedSurfaceOpacity(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

function clampBackdropBlurPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(48, Math.max(0, Math.round(raw)));
}

function clampIntegratedBlurMix(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

function clampRouteSurfacesOpacity(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(1, Math.max(0, raw));
}

export function normalizeIntegratedPageChrome(
  raw: unknown,
  defaults: IntegratedPageChromeState,
): IntegratedPageChromeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  const modeRaw = o.mode;
  const mode: IntegratedPageChromeMode =
    modeRaw === "opaque" || modeRaw === "translucent" || modeRaw === "glass" || modeRaw === "blur"
      ? modeRaw
      : defaults.mode;
  return {
    mode,
    pageSurfaceOpacity: clampIntegratedSurfaceOpacity(o.pageSurfaceOpacity, defaults.pageSurfaceOpacity),
    pageBackdropBlurPx: clampBackdropBlurPx(o.pageBackdropBlurPx, defaults.pageBackdropBlurPx),
    pageBackdropBlurMix: clampIntegratedBlurMix(o.pageBackdropBlurMix, defaults.pageBackdropBlurMix),
    pageRouteSurfacesOpacity: clampRouteSurfacesOpacity(
      o.pageRouteSurfacesOpacity,
      defaults.pageRouteSurfacesOpacity,
    ),
  };
}

export function integratedPageChromeCssVars(ip: IntegratedPageChromeState): Record<string, string> {
  return {
    "--tp-integrated-mode": ip.mode,
    "--tp-integrated-surface-opacity": String(ip.pageSurfaceOpacity),
    "--tp-integrated-backdrop-blur": `${ip.pageBackdropBlurPx}px`,
    "--tp-integrated-backdrop-blur-mix": String(ip.pageBackdropBlurMix),
    "--tp-integrated-route-surfaces-opacity": String(ip.pageRouteSurfacesOpacity),
  };
}

export type { TopBarLogoPresetId };

export type ShellThemeState = {
  /** Global UI font (shell, routes, intro, Theme panel). */
  uiFontId: UiFontId;
  /**
   * Global text-only scale: each non-zero step adds this many px to `text-[Npx]` utilities via `html` hooks.
   * Step **0** removes those hooks so typography matches builds before text scaling (plain Tailwind).
   */
  uiFontSizeStep: number;
  backgroundMode: BackgroundMode;
  backgroundImageDataUrl: string | null;
  backgroundImageFilename: string | null;
  /** When true, shell background image bytes live in IndexedDB, not `backgroundImageDataUrl`. */
  hasStoredBackgroundImage: boolean;
  hasStoredVideo: boolean;
  backgroundVideoFilename: string | null;
  fullOverlay: boolean;
  backgroundLayer: BackgroundLayer;
  /** 0–1 opacity on shell background image/video */
  backgroundOpacity: number;
  backgroundPosition: { x: number; y: number };
  /**
   * CSS `filter: blur()` on wallpaper image/video only (Integrated + Above layers).
   * Does not affect the sidebar or top bar.
   */
  backgroundMediaBlurPx: number;
  /**
   * CSS `filter: saturate()` multiplier on wallpaper (1 = unchanged).
   */
  backgroundMediaSaturate: number;
  logoDataUrl: string | null;
  /** Built-in top-bar logo when `logoDataUrl` is null. */
  topBarLogoPreset: TopBarLogoPresetId;
  logoMode: "image" | "text";
  logoText: string;
  logoTextColor: string;
  logoTextFontId: string;
  logoTextSizePx: number;
  logoTextWeight: number;
  logoTextLetterSpacing: number;
  /**
   * Outer corner radius of the main shell (and Tauri window content). 0 = sharp corners.
   * Clamped 0…WINDOW_CORNER_RADIUS_MAX_PX.
   */
  windowCornerRadiusPx: number;
  topBarFrom: string;
  topBarTo: string;
  shellBg: string;
  sidebarBg: string;
  pageAreaBg: string;
  /** Sidebar nav cell fill when route is inactive (not hovered) */
  sidebarNavInactiveBg: string;
  /** Sidebar nav cell fill when route is active (not hovered) */
  sidebarNavActiveBg: string;
  /** Sidebar nav icon hover fill */
  sidebarNavHoverBg: string;
  /**
   * Rounded “pill” nav buttons (0 = legacy full 60×64 rects using inactive fill).
   * When positive, inactive cells use `sidebarBg` inside the pill area for a seamless rail.
   */
  sidebarNavButtonRadiusPx: number;
  /**
   * Concave scoop depth along the **top horizontal** edge (joint with the row above).
   * 0 = normal rounded corner there. Migrated from legacy `sidebarNavNotchPx` if present.
   */
  sidebarNavNotchTopPx: number;
  /** Concave scoop depth along the **bottom horizontal** edge (joint with the row below). */
  sidebarNavNotchBottomPx: number;
  /**
   * How far each top/bottom notch curve extends horizontally from the center (px). Higher = wider, gentler arcs.
   */
  sidebarNavNotchSpreadPx: number;
  /**
   * Horizontal depth (px) of concave scoops on the **right** edge of the active pill (toward the page). 0 = straight vertical edge.
   */
  sidebarNavTrailingNotchPx: number;
  /** Vertical extent of each right-edge scoop (the theme caps this; the path clamps to the cell). */
  sidebarNavTrailingNotchSpanPx: number;
  /** Icon stroke width in px (1–3). */
  sidebarNavIconStrokeWidthPx: number;
  /** Horizontal inset of the pill from the 60px rail edges. */
  sidebarNavPillInsetHorizontalPx: number;
  /** Vertical inset of the pill inside each 64px-tall cell. */
  sidebarNavPillInsetVerticalPx: number;
  /**
   * Extra vertical space (px) between stacked sidebar nav rows (each row is 64px tall).
   * Total step = 64 + this value.
   */
  sidebarNavCellGapPx: number;
  /** Sidebar glyph stroke when route is inactive */
  sidebarIconStrokeInactive: string;
  /** Sidebar glyph stroke for the active route */
  sidebarIconStrokeActive: string;
  /** Sidebar glyph stroke while hovered */
  sidebarIconStrokeHover: string;
  /** Moving route description tooltip — gradient */
  shellHoverPanelFrom: string;
  shellHoverPanelTo: string;
  /** Editor bottom bar buttons (Execute, Clear, …) */
  editorControlBarButtonFrom: string;
  editorControlBarButtonTo: string;
  editorControlBarBorder: string;
  editorControlBarText: string;
  /** Editor bar button hover (Execute/Clear/etc). Defaults to a slightly brighter version of the bar. */
  editorControlBarHoverFrom: string;
  editorControlBarHoverTo: string;
  /** Attach button hover only (base matches control bar) */
  attachButtonHoverFrom: string;
  attachButtonHoverTo: string;
  editorMonacoThemeId: string;
  editorMonacoThemeIdSynapseOriginal: string;
  editorMonacoThemeIdSynapseX: string;
  editorMonacoThemeIdV3: string;
  editorChromeLabels: EditorChromeLabelsState;
  shellHoverTooltips: ShellHoverTooltipsState;
  initTheme: InitScreenThemeState;
  initThemeSynapseOriginal: InitScreenThemeState;
  initThemeSynapseX: InitScreenThemeState;
  attachOverlayTheme: AttachOverlayThemeState;
  scriptHubTheme: ScriptHubThemeState;
  confirmationTheme: ConfirmationDialogThemeState;
  surfaceElementsTheme: SurfaceElementsThemeState;
  toolPanelsTheme: ToolPanelsThemeState;
  integratedPageChrome: IntegratedPageChromeState;
};

export const DEFAULT_SHELL_THEME: ShellThemeState = {
  uiFontId: "inter",
  uiFontSizeStep: 0,
  backgroundMode: "none",
  backgroundImageDataUrl: null,
  backgroundImageFilename: null,
  hasStoredBackgroundImage: false,
  hasStoredVideo: false,
  backgroundVideoFilename: null,
  fullOverlay: false,
  backgroundLayer: "integrated",
  backgroundOpacity: 1,
  backgroundPosition: { x: 50, y: 50 },
  backgroundMediaBlurPx: 0,
  backgroundMediaSaturate: 1,
  logoDataUrl: null,
  topBarLogoPreset: "wordmark",
  logoMode: "image",
  logoText: "Synapse",
  logoTextColor: "#ffffff",
  logoTextFontId: "inter",
  logoTextSizePx: 14,
  logoTextWeight: 600,
  logoTextLetterSpacing: 0,
  windowCornerRadiusPx: 0,
  topBarFrom: "#233da4",
  topBarTo: "#323f89",
  shellBg: SHELL_BG,
  sidebarBg: "#2f2f2f",
  pageAreaBg: "#222222",
  sidebarNavInactiveBg: "#383838",
  sidebarNavActiveBg: "#404040",
  sidebarNavHoverBg: "#404040",
  sidebarNavButtonRadiusPx: 0,
  sidebarNavNotchTopPx: 0,
  sidebarNavNotchBottomPx: 0,
  sidebarNavNotchSpreadPx: 8,
  sidebarNavTrailingNotchPx: 0,
  sidebarNavTrailingNotchSpanPx: 0,
  sidebarNavIconStrokeWidthPx: 2,
  sidebarNavPillInsetHorizontalPx: 6,
  sidebarNavPillInsetVerticalPx: 4,
  sidebarNavCellGapPx: 2,
  sidebarIconStrokeInactive: "#ececec",
  sidebarIconStrokeActive: "#ffffff",
  sidebarIconStrokeHover: "#ffffff",
  shellHoverPanelFrom: "#324dd8",
  shellHoverPanelTo: "#3344a3",
  editorControlBarButtonFrom: "#494949",
  editorControlBarButtonTo: "#404040",
  editorControlBarBorder: "#606060",
  editorControlBarText: "#c3c3c3",
  editorControlBarHoverFrom: "#515151",
  editorControlBarHoverTo: "#484848",
  attachButtonHoverFrom: "#2d4191",
  attachButtonHoverTo: "#233ea6",
  editorMonacoThemeId: DEFAULT_EDITOR_THEME_ID,
  editorMonacoThemeIdSynapseOriginal: DEFAULT_EDITOR_THEME_ID,
  editorMonacoThemeIdSynapseX: DEFAULT_EDITOR_THEME_ID,
  editorMonacoThemeIdV3: "vs-dark",
  editorChromeLabels: { ...DEFAULT_EDITOR_CHROME_LABELS },
  shellHoverTooltips: {
    "/": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/"] },
    "/script-hub": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/script-hub"] },
    "/console": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/console"] },
    "/settings": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/settings"] },
    "/themes": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/themes"] },
  },
  initTheme: { ...DEFAULT_INIT_THEME },
  initThemeSynapseOriginal: { ...DEFAULT_INIT_THEME },
  initThemeSynapseX: { ...DEFAULT_INIT_THEME },
  attachOverlayTheme: {
    ...DEFAULT_ATTACH_OVERLAY_THEME,
    steps: DEFAULT_ATTACH_OVERLAY_THEME.steps.map((s) => ({ ...s })) as AttachOverlayThemeState["steps"],
  },
  scriptHubTheme: { ...DEFAULT_SCRIPT_HUB_THEME },
  confirmationTheme: { ...DEFAULT_CONFIRMATION_THEME },
  surfaceElementsTheme: { ...DEFAULT_SURFACE_ELEMENTS_THEME },
  toolPanelsTheme: { ...DEFAULT_TOOL_PANELS_THEME },
  integratedPageChrome: { ...DEFAULT_INTEGRATED_PAGE_CHROME },
};

const HEX = /^#([0-9a-fA-F]{6})$/;

function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function clampOpacity(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

function clampBackgroundMediaBlurPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(32, Math.max(0, Math.round(raw)));
}

function clampBackgroundMediaSaturate(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(2, Math.max(0.2, Math.round(raw * 100) / 100));
}

/** CSS `filter` value for wallpaper `<img>` / `<video>` (blur + saturation). */
export function backgroundMediaFilter(theme: ShellThemeState): string | undefined {
  const parts: string[] = [];
  if (theme.backgroundMediaBlurPx > 0) {
    parts.push(`blur(${theme.backgroundMediaBlurPx}px)`);
  }
  if (theme.backgroundMediaSaturate !== 1) {
    parts.push(`saturate(${theme.backgroundMediaSaturate})`);
  }
  return parts.length ? parts.join(" ") : undefined;
}

function normalizeTopBarLogoPreset(raw: unknown, fallback: TopBarLogoPresetId): TopBarLogoPresetId {
  if (raw === "cosmic") return "synapseOriginal";
  if (typeof raw === "string" && isTopBarLogoPresetId(raw)) return raw;
  return fallback;
}

function clampUiFontSizeStep(raw: unknown): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  const n = Math.round(raw);
  return Math.min(UI_FONT_SIZE_STEP_MAX, Math.max(UI_FONT_SIZE_STEP_MIN, n));
}

export function sanitizeHex(input: string, fallback: string): string {
  const t = input.trim();
  return HEX.test(t) ? t.toLowerCase() : fallback;
}

/** Max card corner radius (px) for Script Hub theme slider. */
export const SCRIPT_HUB_THEME_CARD_RADIUS_MAX = 24;

function clampScriptHubCardRadiusPx(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return fallback;
  return Math.min(SCRIPT_HUB_THEME_CARD_RADIUS_MAX, Math.max(0, Math.round(raw)));
}

export function normalizeScriptHubTheme(
  raw: unknown,
  defaults: ScriptHubThemeState,
): ScriptHubThemeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  return {
    cardRadiusPx: clampScriptHubCardRadiusPx(o.cardRadiusPx, defaults.cardRadiusPx),
    cardBorderColor: sanitizeHex(String(o.cardBorderColor ?? defaults.cardBorderColor), defaults.cardBorderColor),
    cardBackground: sanitizeHex(String(o.cardBackground ?? defaults.cardBackground), defaults.cardBackground),
    thumbFallbackBg: sanitizeHex(String(o.thumbFallbackBg ?? defaults.thumbFallbackBg), defaults.thumbFallbackBg),
    titleColor: sanitizeHex(String(o.titleColor ?? defaults.titleColor), defaults.titleColor),
    subtitleColor: sanitizeHex(String(o.subtitleColor ?? defaults.subtitleColor), defaults.subtitleColor),
    searchBackground: sanitizeHex(String(o.searchBackground ?? defaults.searchBackground), defaults.searchBackground),
    searchBorder: sanitizeHex(String(o.searchBorder ?? defaults.searchBorder), defaults.searchBorder),
    searchFocusBorder: sanitizeHex(
      String(o.searchFocusBorder ?? defaults.searchFocusBorder),
      defaults.searchFocusBorder,
    ),
    ctaBackground: sanitizeHex(String(o.ctaBackground ?? defaults.ctaBackground), defaults.ctaBackground),
    ctaHoverBackground: sanitizeHex(
      String(o.ctaHoverBackground ?? defaults.ctaHoverBackground),
      defaults.ctaHoverBackground,
    ),
    ctaBorder: sanitizeHex(String(o.ctaBorder ?? defaults.ctaBorder), defaults.ctaBorder),
    secondaryFrom: sanitizeHex(String(o.secondaryFrom ?? defaults.secondaryFrom), defaults.secondaryFrom),
    secondaryTo: sanitizeHex(String(o.secondaryTo ?? defaults.secondaryTo), defaults.secondaryTo),
    secondaryBorder: sanitizeHex(String(o.secondaryBorder ?? defaults.secondaryBorder), defaults.secondaryBorder),
    secondaryText: sanitizeHex(String(o.secondaryText ?? defaults.secondaryText), defaults.secondaryText),
  };
}

const INIT_LOADING_TITLE_MAX = 56;
const INIT_LOADING_LINE_MAX = 120;
const EDITOR_CHROME_LABEL_MAX = 28;
const EDITOR_PAGE_TITLE_MAX = 40;
const HOVER_TITLE_MAX = 44;
const HOVER_LINE_MAX = 96;

function clipCopy(s: unknown, max: number, fallback: string): string {
  if (typeof s !== "string") return fallback;
  const t = s.trim();
  if (!t) return fallback;
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeInitLoadingSteps(
  raw: unknown,
  defaults: InitScreenThemeState["loadingSteps"],
): InitScreenThemeState["loadingSteps"] {
  const out: InitScreenThemeState["loadingSteps"] = [
    { ...defaults[0] },
    { ...defaults[1] },
    { ...defaults[2] },
  ];
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < 3; i++) {
    const row = raw[i];
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      out[i] = {
        title: clipCopy(r.title, INIT_LOADING_TITLE_MAX, defaults[i].title),
        descriptionLine1: clipCopy(
          r.descriptionLine1 ?? r.descriptionLine_1,
          INIT_LOADING_LINE_MAX,
          defaults[i].descriptionLine1,
        ),
        descriptionLine2: clipCopy(
          r.descriptionLine2 ?? r.descriptionLine_2,
          INIT_LOADING_LINE_MAX,
          defaults[i].descriptionLine2,
        ),
      };
    }
  }
  return out;
}

export function normalizeEditorChromeLabels(
  raw: unknown,
  defaults: EditorChromeLabelsState,
): EditorChromeLabelsState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  return {
    editorPageTitle: clipCopy(o.editorPageTitle, EDITOR_PAGE_TITLE_MAX, defaults.editorPageTitle),
    editorButtonExecute: clipCopy(o.editorButtonExecute, EDITOR_CHROME_LABEL_MAX, defaults.editorButtonExecute),
    editorButtonClear: clipCopy(o.editorButtonClear, EDITOR_CHROME_LABEL_MAX, defaults.editorButtonClear),
    editorButtonOpenFile: clipCopy(o.editorButtonOpenFile, EDITOR_CHROME_LABEL_MAX, defaults.editorButtonOpenFile),
    editorButtonExecuteFile: clipCopy(
      o.editorButtonExecuteFile,
      EDITOR_CHROME_LABEL_MAX,
      defaults.editorButtonExecuteFile,
    ),
    editorButtonSaveFile: clipCopy(o.editorButtonSaveFile, EDITOR_CHROME_LABEL_MAX, defaults.editorButtonSaveFile),
    editorButtonAttach: clipCopy(o.editorButtonAttach, EDITOR_CHROME_LABEL_MAX, defaults.editorButtonAttach),
  };
}

function normalizeHoverOne(
  raw: unknown,
  defaults: ShellHoverTooltipCopy,
): ShellHoverTooltipCopy {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  return {
    title: clipCopy(o.title, HOVER_TITLE_MAX, defaults.title),
    descriptionLine1: clipCopy(o.descriptionLine1, HOVER_LINE_MAX, defaults.descriptionLine1),
    descriptionLine2: clipCopy(o.descriptionLine2, HOVER_LINE_MAX, defaults.descriptionLine2),
  };
}

export function normalizeShellHoverTooltips(
  raw: unknown,
  defaults: ShellHoverTooltipsState,
): ShellHoverTooltipsState {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next = { ...defaults };
  for (const path of SHELL_HOVER_ROUTE_PATHS) {
    next[path] = normalizeHoverOne(o[path], defaults[path]);
  }
  return next;
}

function pickEditorMonacoThemeId(o: Record<string, unknown>): string {
  if (typeof o.editorMonacoThemeId === "string" && isAllowedEditorThemeId(o.editorMonacoThemeId)) {
    return o.editorMonacoThemeId;
  }
  if (typeof window !== "undefined") {
    try {
      const leg = window.localStorage.getItem(LEGACY_EDITOR_THEME_STORAGE_KEY);
      if (typeof leg === "string" && isAllowedEditorThemeId(leg)) return leg;
    } catch {
      /* ignore */
    }
  }
  return normalizeEditorMonacoThemeId(o.editorMonacoThemeId);
}

function normalizeInitTheme(raw: unknown, defaults: InitScreenThemeState): InitScreenThemeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  const pos = o.backgroundPosition;
  let x = 50;
  let y = 50;
  if (pos && typeof pos === "object") {
    const p = pos as Record<string, unknown>;
    if (typeof p.x === "number") x = clamp01(p.x);
    if (typeof p.y === "number") y = clamp01(p.y);
  }
  const mode = o.backgroundMode;
  const bgMode: InitBackgroundMode =
    mode === "image" || mode === "video" || mode === "none" ? mode : "none";

  return {
    shellBg: sanitizeHex(String(o.shellBg ?? defaults.shellBg), defaults.shellBg),
    headerFrom: sanitizeHex(String(o.headerFrom ?? defaults.headerFrom), defaults.headerFrom),
    headerTo: sanitizeHex(String(o.headerTo ?? defaults.headerTo), defaults.headerTo),
    progressBar: sanitizeHex(String(o.progressBar ?? defaults.progressBar), defaults.progressBar),
    progressTrackBackground: sanitizeHex(
      String(o.progressTrackBackground ?? defaults.progressTrackBackground),
      defaults.progressTrackBackground,
    ),
    stepPanelFrom: sanitizeHex(
      String(o.stepPanelFrom ?? defaults.stepPanelFrom),
      defaults.stepPanelFrom,
    ),
    stepPanelTo: sanitizeHex(String(o.stepPanelTo ?? defaults.stepPanelTo), defaults.stepPanelTo),
    stepDotInactive: sanitizeHex(String(o.stepDotInactive ?? defaults.stepDotInactive), defaults.stepDotInactive),
    stepDotActive: sanitizeHex(String(o.stepDotActive ?? defaults.stepDotActive), defaults.stepDotActive),
    stepDotStroke: sanitizeHex(String(o.stepDotStroke ?? defaults.stepDotStroke), defaults.stepDotStroke),
    textPrimary: sanitizeHex(String(o.textPrimary ?? defaults.textPrimary), defaults.textPrimary),
    textSecondary: sanitizeHex(String(o.textSecondary ?? defaults.textSecondary), defaults.textSecondary),
    backgroundMode: bgMode,
    backgroundImageDataUrl:
      typeof o.backgroundImageDataUrl === "string" ? o.backgroundImageDataUrl : null,
    backgroundImageFilename:
      typeof o.backgroundImageFilename === "string" ? o.backgroundImageFilename : null,
    hasStoredBackgroundImage: Boolean(o.hasStoredBackgroundImage),
    hasStoredVideo: Boolean(o.hasStoredVideo),
    backgroundVideoFilename:
      typeof o.backgroundVideoFilename === "string" ? o.backgroundVideoFilename : null,
    backgroundOpacity: clampOpacity(Number(o.backgroundOpacity ?? defaults.backgroundOpacity)),
    backgroundPosition: { x, y },
    loadingSteps: normalizeInitLoadingSteps(o.loadingSteps, defaults.loadingSteps),
  };
}

const CONFIRM_LINE_MAX = 220;

function clipConfirmLine(s: unknown, fallback: string): string {
  if (typeof s !== "string") return fallback;
  const t = s.trim();
  if (!t) return fallback;
  return t.length > CONFIRM_LINE_MAX ? t.slice(0, CONFIRM_LINE_MAX) : t;
}

function normalizeConfirmationTheme(
  raw: unknown,
  defaults: ConfirmationDialogThemeState,
): ConfirmationDialogThemeState {
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  const pos = o.backgroundPosition;
  let x = 50;
  let y = 50;
  if (pos && typeof pos === "object") {
    const p = pos as Record<string, unknown>;
    if (typeof p.x === "number") x = clamp01(p.x);
    if (typeof p.y === "number") y = clamp01(p.y);
  }
  const mode = o.backgroundMode;
  const bgMode: ConfirmationBackgroundMode = mode === "image" || mode === "none" ? mode : "none";
  let ww =
    typeof o.windowWidthPx === "number" && !Number.isNaN(o.windowWidthPx)
      ? Math.round(o.windowWidthPx)
      : defaults.windowWidthPx;
  let wh =
    typeof o.windowHeightPx === "number" && !Number.isNaN(o.windowHeightPx)
      ? Math.round(o.windowHeightPx)
      : defaults.windowHeightPx;
  ww = Math.min(800, Math.max(320, ww));
  wh = Math.min(600, Math.max(200, wh));

  return {
    panelBg: sanitizeHex(String(o.panelBg ?? defaults.panelBg), defaults.panelBg),
    topBarFrom: sanitizeHex(String(o.topBarFrom ?? defaults.topBarFrom), defaults.topBarFrom),
    topBarTo: sanitizeHex(String(o.topBarTo ?? defaults.topBarTo), defaults.topBarTo),
    titleColor: sanitizeHex(String(o.titleColor ?? defaults.titleColor), defaults.titleColor),
    bodyColor: sanitizeHex(String(o.bodyColor ?? defaults.bodyColor), defaults.bodyColor),
    iconStroke: sanitizeHex(String(o.iconStroke ?? defaults.iconStroke), defaults.iconStroke),
    noButtonFrom: sanitizeHex(String(o.noButtonFrom ?? defaults.noButtonFrom), defaults.noButtonFrom),
    noButtonTo: sanitizeHex(String(o.noButtonTo ?? defaults.noButtonTo), defaults.noButtonTo),
    noButtonBorder: sanitizeHex(String(o.noButtonBorder ?? defaults.noButtonBorder), defaults.noButtonBorder),
    noButtonText: sanitizeHex(String(o.noButtonText ?? defaults.noButtonText), defaults.noButtonText),
    yesButtonFrom: sanitizeHex(String(o.yesButtonFrom ?? defaults.yesButtonFrom), defaults.yesButtonFrom),
    yesButtonTo: sanitizeHex(String(o.yesButtonTo ?? defaults.yesButtonTo), defaults.yesButtonTo),
    yesButtonBorder: sanitizeHex(String(o.yesButtonBorder ?? defaults.yesButtonBorder), defaults.yesButtonBorder),
    yesButtonText: sanitizeHex(String(o.yesButtonText ?? defaults.yesButtonText), defaults.yesButtonText),
    windowWidthPx: ww,
    windowHeightPx: wh,
    clearCurrentTitle: clipConfirmLine(o.clearCurrentTitle, defaults.clearCurrentTitle),
    clearCurrentBodyLine1: clipConfirmLine(o.clearCurrentBodyLine1, defaults.clearCurrentBodyLine1),
    clearCurrentBodyLine2: clipConfirmLine(o.clearCurrentBodyLine2, defaults.clearCurrentBodyLine2),
    closeAllTitle: clipConfirmLine(o.closeAllTitle, defaults.closeAllTitle),
    closeAllBodyLine1: clipConfirmLine(o.closeAllBodyLine1, defaults.closeAllBodyLine1),
    closeAllBodyLine2: clipConfirmLine(o.closeAllBodyLine2, defaults.closeAllBodyLine2),
    closeTabTitle: clipConfirmLine(o.closeTabTitle, defaults.closeTabTitle),
    closeTabBodyLine1: clipConfirmLine(o.closeTabBodyLine1, defaults.closeTabBodyLine1),
    closeTabBodyLine2: clipConfirmLine(o.closeTabBodyLine2, defaults.closeTabBodyLine2),
    backgroundMode: bgMode,
    backgroundImageDataUrl:
      typeof o.backgroundImageDataUrl === "string" ? o.backgroundImageDataUrl : null,
    backgroundImageFilename:
      typeof o.backgroundImageFilename === "string" ? o.backgroundImageFilename : null,
    hasStoredBackgroundImage: Boolean(o.hasStoredBackgroundImage),
    backgroundOpacity: clampOpacity(Number(o.backgroundOpacity ?? defaults.backgroundOpacity)),
    backgroundPosition: { x, y },
  };
}

const ATTACH_TITLE_MAX = 40;
const ATTACH_DESC_MAX = 120;
const ATTACH_BAR_MS_MIN = 2500;
const ATTACH_BAR_MS_MAX = 15000;

function clampAttachBarDurationMs(raw: unknown): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return DEFAULT_ATTACH_OVERLAY_THEME.barDurationMs;
  return Math.min(ATTACH_BAR_MS_MAX, Math.max(ATTACH_BAR_MS_MIN, Math.round(raw)));
}

function clipAttachStep(s: unknown, maxLen: number, fallback: string): string {
  if (typeof s !== "string") return fallback;
  const t = s.trim();
  if (!t) return fallback;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export function normalizeAttachOverlayTheme(
  raw: unknown,
  defaults: AttachOverlayThemeState = DEFAULT_ATTACH_OVERLAY_THEME,
): AttachOverlayThemeState {
  if (!raw || typeof raw !== "object") {
    return {
      ...defaults,
      steps: defaults.steps.map((x) => ({ ...x })) as AttachOverlayThemeState["steps"],
    };
  }
  const o = raw as Record<string, unknown>;
  const stepsRaw = o.steps;
  const baseSteps = defaults.steps;
  const outSteps: [AttachOverlayStepCopy, AttachOverlayStepCopy, AttachOverlayStepCopy] = [
    { ...baseSteps[0] },
    { ...baseSteps[1] },
    { ...baseSteps[2] },
  ];
  if (Array.isArray(stepsRaw)) {
    for (let i = 0; i < 3; i++) {
      const row = stepsRaw[i];
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        outSteps[i] = {
          title: clipAttachStep(r.title, ATTACH_TITLE_MAX, baseSteps[i].title),
          description: clipAttachStep(r.description, ATTACH_DESC_MAX, baseSteps[i].description),
        };
      }
    }
  }

  return {
    barDurationMs: clampAttachBarDurationMs(o.barDurationMs ?? defaults.barDurationMs),
    notchFrom: sanitizeHex(String(o.notchFrom ?? defaults.notchFrom), defaults.notchFrom),
    notchTo: sanitizeHex(String(o.notchTo ?? defaults.notchTo), defaults.notchTo),
    barFill: sanitizeHex(String(o.barFill ?? defaults.barFill), defaults.barFill),
    trackFill: sanitizeHex(String(o.trackFill ?? defaults.trackFill), defaults.trackFill),
    trackOpacity: clampOpacity(Number(o.trackOpacity ?? defaults.trackOpacity)),
    dotStroke: sanitizeHex(String(o.dotStroke ?? defaults.dotStroke), defaults.dotStroke),
    dotInactive: sanitizeHex(String(o.dotInactive ?? defaults.dotInactive), defaults.dotInactive),
    dotActive: sanitizeHex(String(o.dotActive ?? defaults.dotActive), defaults.dotActive),
    dotComplete: sanitizeHex(String(o.dotComplete ?? defaults.dotComplete), defaults.dotComplete),
    stepCardFrom: sanitizeHex(String(o.stepCardFrom ?? defaults.stepCardFrom), defaults.stepCardFrom),
    stepCardTo: sanitizeHex(String(o.stepCardTo ?? defaults.stepCardTo), defaults.stepCardTo),
    stepTitleColor: sanitizeHex(String(o.stepTitleColor ?? defaults.stepTitleColor), defaults.stepTitleColor),
    stepBodyColor: sanitizeHex(String(o.stepBodyColor ?? defaults.stepBodyColor), defaults.stepBodyColor),
    steps: outSteps,
  };
}

export function normalizeTheme(raw: unknown): ShellThemeState {
  const d = DEFAULT_SHELL_THEME;
  if (!raw || typeof raw !== "object") {
    return {
      ...d,
      initTheme: normalizeInitTheme(undefined, d.initTheme),
      attachOverlayTheme: normalizeAttachOverlayTheme(undefined, d.attachOverlayTheme),
      scriptHubTheme: normalizeScriptHubTheme(undefined, d.scriptHubTheme),
      confirmationTheme: normalizeConfirmationTheme(undefined, d.confirmationTheme),
      surfaceElementsTheme: normalizeSurfaceElementsTheme(undefined, d.surfaceElementsTheme),
      toolPanelsTheme: normalizeToolPanelsTheme(undefined, d.toolPanelsTheme),
      integratedPageChrome: normalizeIntegratedPageChrome(undefined, d.integratedPageChrome),
    };
  }
  const o = raw as Record<string, unknown>;
  const pos = o.backgroundPosition;
  let x = 50;
  let y = 50;
  if (pos && typeof pos === "object") {
    const p = pos as Record<string, unknown>;
    if (typeof p.x === "number") x = clamp01(p.x);
    if (typeof p.y === "number") y = clamp01(p.y);
  }
  const mode = o.backgroundMode;
  const bgMode: BackgroundMode =
    mode === "image" || mode === "video" || mode === "none" ? mode : "none";

  const layerRaw = o.backgroundLayer;
  const backgroundLayer: BackgroundLayer =
    layerRaw === "above" || layerRaw === "integrated" ? layerRaw : "integrated";

  const legacyFont = o.uiFontId ?? o.themePanelFontId;
  let next: ShellThemeState = {
    uiFontId: normalizeUiFontId(legacyFont),
    uiFontSizeStep: clampUiFontSizeStep(o.uiFontSizeStep),
    backgroundMode: bgMode,
    backgroundImageDataUrl:
      typeof o.backgroundImageDataUrl === "string" ? o.backgroundImageDataUrl : null,
    backgroundImageFilename:
      typeof o.backgroundImageFilename === "string" ? o.backgroundImageFilename : null,
    hasStoredBackgroundImage: Boolean(o.hasStoredBackgroundImage),
    hasStoredVideo: Boolean(o.hasStoredVideo),
    backgroundVideoFilename:
      typeof o.backgroundVideoFilename === "string" ? o.backgroundVideoFilename : null,
    fullOverlay: Boolean(o.fullOverlay),
    backgroundLayer,
    backgroundOpacity: clampOpacity(Number(o.backgroundOpacity)),
    backgroundPosition: { x, y },
    backgroundMediaBlurPx: clampBackgroundMediaBlurPx(o.backgroundMediaBlurPx, d.backgroundMediaBlurPx),
    backgroundMediaSaturate: clampBackgroundMediaSaturate(o.backgroundMediaSaturate, d.backgroundMediaSaturate),
    logoDataUrl: typeof o.logoDataUrl === "string" ? o.logoDataUrl : null,
    topBarLogoPreset: normalizeTopBarLogoPreset(o.topBarLogoPreset, d.topBarLogoPreset),
    logoMode: o.logoMode === "text" ? "text" : "image",
    logoText:
      typeof o.logoText === "string" && o.logoText.trim() ? o.logoText : d.logoText,
    logoTextColor: sanitizeHex(String(o.logoTextColor ?? d.logoTextColor), d.logoTextColor),
    logoTextFontId: normalizeUiFontId(o.logoTextFontId ?? d.logoTextFontId),
    logoTextSizePx: clampPx(Number(o.logoTextSizePx), d.logoTextSizePx, 8, 32),
    logoTextWeight: clampPx(Number(o.logoTextWeight), d.logoTextWeight, 300, 900),
    logoTextLetterSpacing: clampPx(Number(o.logoTextLetterSpacing), d.logoTextLetterSpacing, -2, 8),
    windowCornerRadiusPx: clampWindowCornerRadiusPx(o.windowCornerRadiusPx, d.windowCornerRadiusPx),
    topBarFrom: sanitizeHex(String(o.topBarFrom ?? d.topBarFrom), d.topBarFrom),
    topBarTo: sanitizeHex(String(o.topBarTo ?? d.topBarTo), d.topBarTo),
    shellBg: sanitizeHex(String(o.shellBg ?? d.shellBg), d.shellBg),
    sidebarBg: sanitizeHex(String(o.sidebarBg ?? d.sidebarBg), d.sidebarBg),
    pageAreaBg: sanitizeHex(String(o.pageAreaBg ?? d.pageAreaBg), d.pageAreaBg),
    sidebarNavInactiveBg: sanitizeHex(
      String(o.sidebarNavInactiveBg ?? d.sidebarNavInactiveBg),
      d.sidebarNavInactiveBg,
    ),
    sidebarNavActiveBg: sanitizeHex(
      String(o.sidebarNavActiveBg ?? d.sidebarNavActiveBg),
      d.sidebarNavActiveBg,
    ),
    sidebarNavHoverBg: sanitizeHex(String(o.sidebarNavHoverBg ?? d.sidebarNavHoverBg), d.sidebarNavHoverBg),
    sidebarNavButtonRadiusPx: clampSidebarNavButtonRadiusPx(
      o.sidebarNavButtonRadiusPx,
      d.sidebarNavButtonRadiusPx,
    ),
    ...(() => {
      const legacy =
        typeof (o as Record<string, unknown>).sidebarNavNotchPx === "number" &&
        !Number.isNaN((o as Record<string, unknown>).sidebarNavNotchPx as number)
          ? clampSidebarNavNotchDepthPx(
              (o as Record<string, unknown>).sidebarNavNotchPx,
              d.sidebarNavNotchTopPx,
            )
          : null;
      return {
        sidebarNavNotchTopPx: clampSidebarNavNotchDepthPx(
          o.sidebarNavNotchTopPx ?? legacy ?? d.sidebarNavNotchTopPx,
          d.sidebarNavNotchTopPx,
        ),
        sidebarNavNotchBottomPx: clampSidebarNavNotchDepthPx(
          o.sidebarNavNotchBottomPx ?? legacy ?? d.sidebarNavNotchBottomPx,
          d.sidebarNavNotchBottomPx,
        ),
        sidebarNavNotchSpreadPx: clampSidebarNavNotchSpreadPx(
          o.sidebarNavNotchSpreadPx,
          d.sidebarNavNotchSpreadPx,
        ),
        sidebarNavTrailingNotchPx: clampSidebarNavTrailingNotchPx(
          "sidebarNavTrailingNotchPx" in o ? o.sidebarNavTrailingNotchPx : 0,
          d.sidebarNavTrailingNotchPx,
        ),
        sidebarNavTrailingNotchSpanPx: clampSidebarNavTrailingSpanPx(
          "sidebarNavTrailingNotchSpanPx" in o ? o.sidebarNavTrailingNotchSpanPx : 0,
          d.sidebarNavTrailingNotchSpanPx,
        ),
        sidebarNavIconStrokeWidthPx: clampSidebarNavIconStrokeWidthPx(
          o.sidebarNavIconStrokeWidthPx,
          d.sidebarNavIconStrokeWidthPx,
        ),
        sidebarNavPillInsetHorizontalPx: clampSidebarNavPillInsetHPx(
          o.sidebarNavPillInsetHorizontalPx,
          d.sidebarNavPillInsetHorizontalPx,
        ),
        sidebarNavPillInsetVerticalPx: clampSidebarNavPillInsetVPx(
          o.sidebarNavPillInsetVerticalPx,
          d.sidebarNavPillInsetVerticalPx,
        ),
        sidebarNavCellGapPx: clampSidebarNavCellGapPx(o.sidebarNavCellGapPx, d.sidebarNavCellGapPx),
      };
    })(),
    sidebarIconStrokeInactive: sanitizeHex(
      String(o.sidebarIconStrokeInactive ?? d.sidebarIconStrokeInactive),
      d.sidebarIconStrokeInactive,
    ),
    sidebarIconStrokeActive: sanitizeHex(
      String(o.sidebarIconStrokeActive ?? d.sidebarIconStrokeActive),
      d.sidebarIconStrokeActive,
    ),
    sidebarIconStrokeHover: sanitizeHex(
      String(o.sidebarIconStrokeHover ?? d.sidebarIconStrokeHover),
      d.sidebarIconStrokeHover,
    ),
    shellHoverPanelFrom: sanitizeHex(
      String(o.shellHoverPanelFrom ?? d.shellHoverPanelFrom),
      d.shellHoverPanelFrom,
    ),
    shellHoverPanelTo: sanitizeHex(String(o.shellHoverPanelTo ?? d.shellHoverPanelTo), d.shellHoverPanelTo),
    editorControlBarButtonFrom: sanitizeHex(
      String(o.editorControlBarButtonFrom ?? d.editorControlBarButtonFrom),
      d.editorControlBarButtonFrom,
    ),
    editorControlBarButtonTo: sanitizeHex(
      String(o.editorControlBarButtonTo ?? d.editorControlBarButtonTo),
      d.editorControlBarButtonTo,
    ),
    editorControlBarBorder: sanitizeHex(
      String(o.editorControlBarBorder ?? d.editorControlBarBorder),
      d.editorControlBarBorder,
    ),
    editorControlBarText: sanitizeHex(
      String(o.editorControlBarText ?? d.editorControlBarText),
      d.editorControlBarText,
    ),
    editorControlBarHoverFrom: sanitizeHex(
      String(o.editorControlBarHoverFrom ?? d.editorControlBarHoverFrom),
      d.editorControlBarHoverFrom,
    ),
    editorControlBarHoverTo: sanitizeHex(
      String(o.editorControlBarHoverTo ?? d.editorControlBarHoverTo),
      d.editorControlBarHoverTo,
    ),
    attachButtonHoverFrom: sanitizeHex(
      String(o.attachButtonHoverFrom ?? d.attachButtonHoverFrom),
      d.attachButtonHoverFrom,
    ),
    attachButtonHoverTo: sanitizeHex(
      String(o.attachButtonHoverTo ?? d.attachButtonHoverTo),
      d.attachButtonHoverTo,
    ),
    editorMonacoThemeId: pickEditorMonacoThemeId(o),
    editorMonacoThemeIdSynapseOriginal: (() => {
      const id =
        o.editorMonacoThemeIdSynapseOriginal ?? o.editorMonacoThemeIdCosmic;
      return typeof id === "string" && isAllowedEditorThemeId(id) ? id : d.editorMonacoThemeIdSynapseOriginal;
    })(),
    editorMonacoThemeIdSynapseX: typeof o.editorMonacoThemeIdSynapseX === "string" && isAllowedEditorThemeId(o.editorMonacoThemeIdSynapseX) ? o.editorMonacoThemeIdSynapseX : d.editorMonacoThemeIdSynapseX,
    editorMonacoThemeIdV3: typeof o.editorMonacoThemeIdV3 === "string" && isAllowedEditorThemeId(o.editorMonacoThemeIdV3) ? o.editorMonacoThemeIdV3 : d.editorMonacoThemeIdV3,
    editorChromeLabels: normalizeEditorChromeLabels(o.editorChromeLabels, d.editorChromeLabels),
    shellHoverTooltips: normalizeShellHoverTooltips(o.shellHoverTooltips, d.shellHoverTooltips),
    initTheme: normalizeInitTheme(o.initTheme, d.initTheme),
    initThemeSynapseOriginal: normalizeInitTheme(
      o.initThemeSynapseOriginal ?? o.initThemeCosmic ?? o.initTheme,
      d.initThemeSynapseOriginal,
    ),
    initThemeSynapseX: normalizeInitTheme(
      o.initThemeSynapseX ?? o.initTheme,
      d.initThemeSynapseX,
    ),
    attachOverlayTheme: normalizeAttachOverlayTheme(
      o.attachOverlayTheme ?? d.attachOverlayTheme,
      d.attachOverlayTheme,
    ),
    scriptHubTheme: normalizeScriptHubTheme(o.scriptHubTheme, d.scriptHubTheme),
    confirmationTheme: normalizeConfirmationTheme(o.confirmationTheme, d.confirmationTheme),
    surfaceElementsTheme: normalizeSurfaceElementsTheme(o.surfaceElementsTheme, d.surfaceElementsTheme),
    toolPanelsTheme: normalizeToolPanelsTheme(o.toolPanelsTheme, d.toolPanelsTheme),
    integratedPageChrome: normalizeIntegratedPageChrome(o.integratedPageChrome, d.integratedPageChrome),
  };

  if (next.backgroundMode === "video") {
    next.backgroundImageDataUrl = null;
    next.backgroundImageFilename = null;
    next.hasStoredBackgroundImage = false;
  }
  if (next.backgroundMode === "image") {
    next.hasStoredVideo = false;
    next.backgroundVideoFilename = null;
  }
  if (next.backgroundMode === "none") {
    next.backgroundImageDataUrl = null;
    next.backgroundImageFilename = null;
    next.hasStoredBackgroundImage = false;
    next.hasStoredVideo = false;
    next.backgroundVideoFilename = null;
  }

  if (next.initTheme.backgroundMode === "video") {
    next.initTheme.backgroundImageDataUrl = null;
    next.initTheme.backgroundImageFilename = null;
    next.initTheme.hasStoredBackgroundImage = false;
  }
  if (next.initTheme.backgroundMode === "image") {
    next.initTheme.hasStoredVideo = false;
    next.initTheme.backgroundVideoFilename = null;
  }
  if (next.initTheme.backgroundMode === "none") {
    next.initTheme.backgroundImageDataUrl = null;
    next.initTheme.backgroundImageFilename = null;
    next.initTheme.hasStoredBackgroundImage = false;
    next.initTheme.hasStoredVideo = false;
    next.initTheme.backgroundVideoFilename = null;
  }

  if (next.initThemeSynapseOriginal.backgroundMode === "video") {
    next.initThemeSynapseOriginal.backgroundImageDataUrl = null;
    next.initThemeSynapseOriginal.backgroundImageFilename = null;
    next.initThemeSynapseOriginal.hasStoredBackgroundImage = false;
  }
  if (next.initThemeSynapseOriginal.backgroundMode === "image") {
    next.initThemeSynapseOriginal.hasStoredVideo = false;
    next.initThemeSynapseOriginal.backgroundVideoFilename = null;
  }
  if (next.initThemeSynapseOriginal.backgroundMode === "none") {
    next.initThemeSynapseOriginal.backgroundImageDataUrl = null;
    next.initThemeSynapseOriginal.backgroundImageFilename = null;
    next.initThemeSynapseOriginal.hasStoredBackgroundImage = false;
    next.initThemeSynapseOriginal.hasStoredVideo = false;
    next.initThemeSynapseOriginal.backgroundVideoFilename = null;
  }

  if (next.initThemeSynapseX.backgroundMode === "video") {
    next.initThemeSynapseX.backgroundImageDataUrl = null;
    next.initThemeSynapseX.backgroundImageFilename = null;
    next.initThemeSynapseX.hasStoredBackgroundImage = false;
  }
  if (next.initThemeSynapseX.backgroundMode === "image") {
    next.initThemeSynapseX.hasStoredVideo = false;
    next.initThemeSynapseX.backgroundVideoFilename = null;
  }
  if (next.initThemeSynapseX.backgroundMode === "none") {
    next.initThemeSynapseX.backgroundImageDataUrl = null;
    next.initThemeSynapseX.backgroundImageFilename = null;
    next.initThemeSynapseX.hasStoredBackgroundImage = false;
    next.initThemeSynapseX.hasStoredVideo = false;
    next.initThemeSynapseX.backgroundVideoFilename = null;
  }

  if (next.backgroundMode === "image" && next.hasStoredBackgroundImage) {
    next.backgroundImageDataUrl = null;
  }
  if (next.initTheme.backgroundMode === "image" && next.initTheme.hasStoredBackgroundImage) {
    next.initTheme.backgroundImageDataUrl = null;
  }

  if (next.confirmationTheme.backgroundMode === "none") {
    next.confirmationTheme.backgroundImageDataUrl = null;
    next.confirmationTheme.backgroundImageFilename = null;
    next.confirmationTheme.hasStoredBackgroundImage = false;
  }
  if (next.confirmationTheme.backgroundMode === "image" && next.confirmationTheme.hasStoredBackgroundImage) {
    next.confirmationTheme.backgroundImageDataUrl = null;
  }

  if (next.backgroundLayer === "above") {
    next.backgroundOpacity = Math.min(next.backgroundOpacity, MAX_ABOVE_UI_BACKGROUND_OPACITY);
  }

  return next;
}

function persistTheme(t: ShellThemeState): void {
  localStorage.setItem(SHELL_THEME_STORAGE_KEY, JSON.stringify(t));
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(SHELL_THEME_CHANGED_EVENT));
}

const LEGACY_SHELL_THEME_STORAGE_KEY = "cosmic.shellTheme";

export function readShellTheme(): ShellThemeState {
  try {
    let raw = localStorage.getItem(SHELL_THEME_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_SHELL_THEME_STORAGE_KEY);
      if (raw) {
        try {
          localStorage.setItem(SHELL_THEME_STORAGE_KEY, raw);
          localStorage.removeItem(LEGACY_SHELL_THEME_STORAGE_KEY);
        } catch {
          /* ignore quota */
        }
      }
    }
    if (!raw) {
      return {
        ...DEFAULT_SHELL_THEME,
        initTheme: normalizeInitTheme(undefined, DEFAULT_SHELL_THEME.initTheme),
        attachOverlayTheme: normalizeAttachOverlayTheme(undefined, DEFAULT_SHELL_THEME.attachOverlayTheme),
      };
    }
    return normalizeTheme(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_SHELL_THEME,
      initTheme: normalizeInitTheme(undefined, DEFAULT_SHELL_THEME.initTheme),
      attachOverlayTheme: normalizeAttachOverlayTheme(undefined, DEFAULT_SHELL_THEME.attachOverlayTheme),
    };
  }
}

export function writeShellTheme(partial: Partial<ShellThemeState>): ShellThemeState {
  const cur = readShellTheme();
  const merged: ShellThemeState = {
    ...cur,
    ...partial,
    editorMonacoThemeId:
      partial.editorMonacoThemeId != null
        ? normalizeEditorMonacoThemeId(partial.editorMonacoThemeId)
        : cur.editorMonacoThemeId,
    editorMonacoThemeIdSynapseOriginal:
      partial.editorMonacoThemeIdSynapseOriginal != null
        ? normalizeEditorMonacoThemeId(partial.editorMonacoThemeIdSynapseOriginal)
        : cur.editorMonacoThemeIdSynapseOriginal,
    editorMonacoThemeIdSynapseX:
      partial.editorMonacoThemeIdSynapseX != null
        ? normalizeEditorMonacoThemeId(partial.editorMonacoThemeIdSynapseX)
        : cur.editorMonacoThemeIdSynapseX,
    editorMonacoThemeIdV3:
      partial.editorMonacoThemeIdV3 != null
        ? normalizeEditorMonacoThemeId(partial.editorMonacoThemeIdV3)
        : cur.editorMonacoThemeIdV3,
    editorChromeLabels:
      partial.editorChromeLabels != null
        ? normalizeEditorChromeLabels(
            { ...cur.editorChromeLabels, ...partial.editorChromeLabels },
            cur.editorChromeLabels,
          )
        : cur.editorChromeLabels,
    shellHoverTooltips:
      partial.shellHoverTooltips != null
        ? normalizeShellHoverTooltips(
            { ...cur.shellHoverTooltips, ...partial.shellHoverTooltips },
            cur.shellHoverTooltips,
          )
        : cur.shellHoverTooltips,
    initTheme:
      partial.initTheme != null ? { ...cur.initTheme, ...partial.initTheme } : cur.initTheme,
    initThemeSynapseOriginal:
      partial.initThemeSynapseOriginal != null ? { ...cur.initThemeSynapseOriginal, ...partial.initThemeSynapseOriginal } : cur.initThemeSynapseOriginal,
    initThemeSynapseX:
      partial.initThemeSynapseX != null ? { ...cur.initThemeSynapseX, ...partial.initThemeSynapseX } : cur.initThemeSynapseX,
    attachOverlayTheme:
      partial.attachOverlayTheme != null
        ? normalizeAttachOverlayTheme(
            { ...cur.attachOverlayTheme, ...partial.attachOverlayTheme },
            cur.attachOverlayTheme,
          )
        : cur.attachOverlayTheme,
    scriptHubTheme:
      partial.scriptHubTheme != null
        ? normalizeScriptHubTheme({ ...cur.scriptHubTheme, ...partial.scriptHubTheme }, DEFAULT_SCRIPT_HUB_THEME)
        : cur.scriptHubTheme,
    confirmationTheme:
      partial.confirmationTheme != null
        ? normalizeConfirmationTheme(
            { ...cur.confirmationTheme, ...partial.confirmationTheme },
            cur.confirmationTheme,
          )
        : cur.confirmationTheme,
    surfaceElementsTheme:
      partial.surfaceElementsTheme != null
        ? normalizeSurfaceElementsTheme(
            { ...cur.surfaceElementsTheme, ...partial.surfaceElementsTheme },
            cur.surfaceElementsTheme,
          )
        : cur.surfaceElementsTheme,
    toolPanelsTheme:
      partial.toolPanelsTheme != null
        ? normalizeToolPanelsTheme({ ...cur.toolPanelsTheme, ...partial.toolPanelsTheme }, cur.toolPanelsTheme)
        : cur.toolPanelsTheme,
    integratedPageChrome:
      partial.integratedPageChrome != null
        ? normalizeIntegratedPageChrome(
            { ...cur.integratedPageChrome, ...partial.integratedPageChrome },
            cur.integratedPageChrome,
          )
        : cur.integratedPageChrome,
  };
  const next = normalizeTheme(merged);
  persistTheme(next);
  dispatchChanged();
  return next;
}

export async function resetShellThemeBackground(): Promise<ShellThemeState> {
  await idbDeleteBackgroundVideo();
  await idbDeleteBackgroundImage();
  return writeShellTheme({
    backgroundMode: "none",
    backgroundImageDataUrl: null,
    backgroundImageFilename: null,
    hasStoredBackgroundImage: false,
    hasStoredVideo: false,
    backgroundVideoFilename: null,
    fullOverlay: DEFAULT_SHELL_THEME.fullOverlay,
    backgroundLayer: DEFAULT_SHELL_THEME.backgroundLayer,
    backgroundOpacity: DEFAULT_SHELL_THEME.backgroundOpacity,
    backgroundPosition: { ...DEFAULT_SHELL_THEME.backgroundPosition },
    backgroundMediaBlurPx: DEFAULT_SHELL_THEME.backgroundMediaBlurPx,
    backgroundMediaSaturate: DEFAULT_SHELL_THEME.backgroundMediaSaturate,
  });
}

export function resetShellThemeLogo(): ShellThemeState {
  return writeShellTheme({ logoDataUrl: null, topBarLogoPreset: "wordmark" });
}

export function resetShellThemeTopBar(): ShellThemeState {
  return writeShellTheme({
    topBarFrom: DEFAULT_SHELL_THEME.topBarFrom,
    topBarTo: DEFAULT_SHELL_THEME.topBarTo,
  });
}

export function resetShellThemeGeneralColors(): ShellThemeState {
  return writeShellTheme({
    shellBg: DEFAULT_SHELL_THEME.shellBg,
    sidebarBg: DEFAULT_SHELL_THEME.sidebarBg,
    pageAreaBg: DEFAULT_SHELL_THEME.pageAreaBg,
    sidebarNavInactiveBg: DEFAULT_SHELL_THEME.sidebarNavInactiveBg,
    sidebarNavActiveBg: DEFAULT_SHELL_THEME.sidebarNavActiveBg,
    windowCornerRadiusPx: DEFAULT_SHELL_THEME.windowCornerRadiusPx,
  });
}

export function resetShellThemeSidebarControl(): ShellThemeState {
  return writeShellTheme({
    sidebarNavButtonRadiusPx: DEFAULT_SHELL_THEME.sidebarNavButtonRadiusPx,
    sidebarNavNotchTopPx: DEFAULT_SHELL_THEME.sidebarNavNotchTopPx,
    sidebarNavNotchBottomPx: DEFAULT_SHELL_THEME.sidebarNavNotchBottomPx,
    sidebarNavNotchSpreadPx: DEFAULT_SHELL_THEME.sidebarNavNotchSpreadPx,
    sidebarNavTrailingNotchPx: DEFAULT_SHELL_THEME.sidebarNavTrailingNotchPx,
    sidebarNavTrailingNotchSpanPx: DEFAULT_SHELL_THEME.sidebarNavTrailingNotchSpanPx,
    sidebarNavIconStrokeWidthPx: DEFAULT_SHELL_THEME.sidebarNavIconStrokeWidthPx,
    sidebarNavPillInsetHorizontalPx: DEFAULT_SHELL_THEME.sidebarNavPillInsetHorizontalPx,
    sidebarNavPillInsetVerticalPx: DEFAULT_SHELL_THEME.sidebarNavPillInsetVerticalPx,
    sidebarNavCellGapPx: DEFAULT_SHELL_THEME.sidebarNavCellGapPx,
    sidebarIconStrokeInactive: DEFAULT_SHELL_THEME.sidebarIconStrokeInactive,
    sidebarIconStrokeActive: DEFAULT_SHELL_THEME.sidebarIconStrokeActive,
    sidebarIconStrokeHover: DEFAULT_SHELL_THEME.sidebarIconStrokeHover,
  });
}

export function resetShellThemeChromeControls(): ShellThemeState {
  return writeShellTheme({
    sidebarNavHoverBg: DEFAULT_SHELL_THEME.sidebarNavHoverBg,
    shellHoverPanelFrom: DEFAULT_SHELL_THEME.shellHoverPanelFrom,
    shellHoverPanelTo: DEFAULT_SHELL_THEME.shellHoverPanelTo,
    editorControlBarButtonFrom: DEFAULT_SHELL_THEME.editorControlBarButtonFrom,
    editorControlBarButtonTo: DEFAULT_SHELL_THEME.editorControlBarButtonTo,
    editorControlBarBorder: DEFAULT_SHELL_THEME.editorControlBarBorder,
    editorControlBarText: DEFAULT_SHELL_THEME.editorControlBarText,
    editorControlBarHoverFrom: DEFAULT_SHELL_THEME.editorControlBarHoverFrom,
    editorControlBarHoverTo: DEFAULT_SHELL_THEME.editorControlBarHoverTo,
    attachButtonHoverFrom: DEFAULT_SHELL_THEME.attachButtonHoverFrom,
    attachButtonHoverTo: DEFAULT_SHELL_THEME.attachButtonHoverTo,
    editorChromeLabels: { ...DEFAULT_EDITOR_CHROME_LABELS },
    shellHoverTooltips: {
      "/": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/"] },
      "/script-hub": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/script-hub"] },
      "/console": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/console"] },
      "/settings": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/settings"] },
      "/themes": { ...DEFAULT_SHELL_HOVER_TOOLTIPS["/themes"] },
    },
  });
}

export async function resetInitTheme(): Promise<ShellThemeState> {
  await idbDeleteInitBackgroundVideo();
  await idbDeleteInitBackgroundImage();
  return writeShellTheme({ initTheme: normalizeInitTheme(undefined, DEFAULT_INIT_THEME) });
}

export function resetAttachOverlayTheme(): ShellThemeState {
  return writeShellTheme({
    attachOverlayTheme: normalizeAttachOverlayTheme(undefined, DEFAULT_ATTACH_OVERLAY_THEME),
  });
}

export function resetScriptHubTheme(): ShellThemeState {
  return writeShellTheme({
    scriptHubTheme: normalizeScriptHubTheme(undefined, DEFAULT_SCRIPT_HUB_THEME),
  });
}

export function resetSurfaceElementsTheme(): ShellThemeState {
  return writeShellTheme({
    surfaceElementsTheme: normalizeSurfaceElementsTheme(undefined, DEFAULT_SURFACE_ELEMENTS_THEME),
  });
}

export function resetToolPanelsTheme(): ShellThemeState {
  return writeShellTheme({
    toolPanelsTheme: normalizeToolPanelsTheme(undefined, DEFAULT_TOOL_PANELS_THEME),
  });
}

export async function resetConfirmationTheme(): Promise<ShellThemeState> {
  await idbDeleteConfirmationBackgroundImage();
  return writeShellTheme({
    confirmationTheme: normalizeConfirmationTheme(undefined, DEFAULT_CONFIRMATION_THEME),
  });
}

export async function resetShellThemeAll(): Promise<ShellThemeState> {
  await idbDeleteBackgroundVideo();
  await idbDeleteBackgroundImage();
  await idbDeleteInitBackgroundVideo();
  await idbDeleteInitBackgroundImage();
  await idbDeleteConfirmationBackgroundImage();
  const cleared: ShellThemeState = {
    ...DEFAULT_SHELL_THEME,
    initTheme: { ...DEFAULT_INIT_THEME },
    attachOverlayTheme: normalizeAttachOverlayTheme(undefined, DEFAULT_ATTACH_OVERLAY_THEME),
    scriptHubTheme: { ...DEFAULT_SCRIPT_HUB_THEME },
    confirmationTheme: { ...DEFAULT_CONFIRMATION_THEME },
    surfaceElementsTheme: { ...DEFAULT_SURFACE_ELEMENTS_THEME },
    toolPanelsTheme: { ...DEFAULT_TOOL_PANELS_THEME },
    integratedPageChrome: { ...DEFAULT_INTEGRATED_PAGE_CHROME },
  };
  persistTheme(cleared);
  dispatchChanged();
  return cleared;
}

/** Full replace of persisted shell theme (used by theme pack import). */
export function applyFullShellTheme(theme: ShellThemeState): ShellThemeState {
  const next = normalizeTheme(JSON.parse(JSON.stringify(theme)));
  persistTheme(next);
  dispatchChanged();
  return next;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/** Some Windows pickers leave MIME empty; still allow common raster extensions (e.g. JPEG). */
function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const n = file.name.toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/.test(n);
}

export async function setBackgroundImageFromFile(
  file: File,
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!isLikelyImageFile(file)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image too large (max ~${Math.round(MAX_BACKGROUND_IMAGE_BYTES / 1_000_000)}MB).`,
    };
  }
  await idbPutBackgroundImage(file);
  await idbDeleteBackgroundVideo();
  const theme = writeShellTheme({
    backgroundMode: "image",
    backgroundImageDataUrl: null,
    hasStoredBackgroundImage: true,
    backgroundImageFilename: file.name,
    hasStoredVideo: false,
    backgroundVideoFilename: null,
    fullOverlay: true,
  });
  return { ok: true, theme };
}

export async function setBackgroundVideoFromFile(
  file: File,
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "Choose a video file." };
  }
  if (file.size > MAX_BACKGROUND_VIDEO_BYTES) {
    return { ok: false, error: "Video too large (max 40MB)." };
  }
  await idbDeleteBackgroundImage();
  await idbPutBackgroundVideo(file);
  const theme = writeShellTheme({
    backgroundMode: "video",
    backgroundImageDataUrl: null,
    backgroundImageFilename: null,
    hasStoredBackgroundImage: false,
    hasStoredVideo: true,
    backgroundVideoFilename: file.name,
    fullOverlay: true,
  });
  return { ok: true, theme };
}

export async function setLogoFromFile(
  file: File,
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!isLikelyImageFile(file)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo image is too large." };
  }
  const dataUrl = await fileToDataUrl(file);
  const theme = writeShellTheme({ logoDataUrl: dataUrl });
  return { ok: true, theme };
}

export async function setInitBackgroundImageFromFile(
  file: File,
  shell: "default" | "synapseOriginal" | "synapseX" = "default",
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!isLikelyImageFile(file)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image too large (max ~${Math.round(MAX_BACKGROUND_IMAGE_BYTES / 1_000_000)}MB).`,
    };
  }
  await idbPutInitBackgroundImage(file, shell);
  await idbDeleteInitBackgroundVideo(shell);
  const cur = readShellTheme();
  const key = shell === "synapseOriginal" ? "initThemeSynapseOriginal" : shell === "synapseX" ? "initThemeSynapseX" : "initTheme";
  const sub = cur[key] as InitScreenThemeState;
  const theme = writeShellTheme({
    [key]: {
      ...sub,
      backgroundMode: "image",
      backgroundImageDataUrl: null,
      hasStoredBackgroundImage: true,
      backgroundImageFilename: file.name,
      hasStoredVideo: false,
      backgroundVideoFilename: null,
    },
  });
  return { ok: true, theme };
}

export async function setInitBackgroundVideoFromFile(
  file: File,
  shell: "default" | "synapseOriginal" | "synapseX" = "default",
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "Choose a video file." };
  }
  if (file.size > MAX_BACKGROUND_VIDEO_BYTES) {
    return { ok: false, error: "Video too large (max 40MB)." };
  }
  await idbDeleteInitBackgroundImage(shell);
  await idbPutInitBackgroundVideo(file, shell);
  const cur = readShellTheme();
  const key = shell === "synapseOriginal" ? "initThemeSynapseOriginal" : shell === "synapseX" ? "initThemeSynapseX" : "initTheme";
  const sub = cur[key] as InitScreenThemeState;
  const theme = writeShellTheme({
    [key]: {
      ...sub,
      backgroundMode: "video",
      backgroundImageDataUrl: null,
      backgroundImageFilename: null,
      hasStoredBackgroundImage: false,
      hasStoredVideo: true,
      backgroundVideoFilename: file.name,
    },
  });
  return { ok: true, theme };
}

export async function loadBackgroundVideoObjectUrl(): Promise<string | null> {
  const t = readShellTheme();
  if (t.backgroundMode !== "video" || !t.hasStoredVideo) return null;
  const blob = await idbGetBackgroundVideo();
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function loadInitVideoObjectUrl(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<string | null> {
  const t = readShellTheme();
  const sub = shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
  if (sub.backgroundMode !== "video" || !sub.hasStoredVideo) return null;
  const blob = await idbGetInitBackgroundVideo(shell);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function loadBackgroundImageObjectUrl(): Promise<string | null> {
  const t = readShellTheme();
  if (t.backgroundMode !== "image" || !t.hasStoredBackgroundImage) return null;
  const blob = await idbGetBackgroundImage();
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function loadInitBackgroundImageObjectUrl(shell: "default" | "synapseOriginal" | "synapseX" = "default"): Promise<string | null> {
  const t = readShellTheme();
  const sub = shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
  if (sub.backgroundMode !== "image" || !sub.hasStoredBackgroundImage) return null;
  const blob = await idbGetInitBackgroundImage(shell);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function loadConfirmationBackgroundImageObjectUrl(): Promise<string | null> {
  const t = readShellTheme();
  if (t.confirmationTheme.backgroundMode !== "image" || !t.confirmationTheme.hasStoredBackgroundImage) {
    return null;
  }
  const blob = await idbGetConfirmationBackgroundImage();
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function setConfirmationBackgroundImageFromFile(
  file: File,
): Promise<{ ok: true; theme: ShellThemeState } | { ok: false; error: string }> {
  if (!isLikelyImageFile(file)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image too large (max ~${Math.round(MAX_BACKGROUND_IMAGE_BYTES / 1_000_000)}MB).`,
    };
  }
  await idbPutConfirmationBackgroundImage(file);
  const cur = readShellTheme();
  const theme = writeShellTheme({
    confirmationTheme: {
      ...cur.confirmationTheme,
      backgroundMode: "image",
      backgroundImageDataUrl: null,
      hasStoredBackgroundImage: true,
      backgroundImageFilename: file.name,
    },
  });
  return { ok: true, theme };
}

export function revokeBackgroundVideoObjectUrl(url: string | null): void {
  if (url) URL.revokeObjectURL(url);
}

export function hasActiveBackgroundMedia(
  theme: ShellThemeState,
  videoObjectUrl: string | null,
  imageObjectUrl: string | null,
): boolean {
  if (theme.backgroundMode === "image") {
    if (theme.backgroundImageDataUrl) return true;
    if (theme.hasStoredBackgroundImage) return true;
  }
  if (theme.backgroundMode === "video" && theme.hasStoredVideo) return true;
  return false;
}

export function hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgbComponents(sanitizeHex(hex, DEFAULT_SHELL_THEME.shellBg));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Route column surface when integrated wallpaper is active (MainLayout `<Outlet />` host). */
export function integratedRouteColumnStyle(
  theme: ShellThemeState,
  hasPageBackground: boolean,
): CSSProperties {
  if (!hasPageBackground) {
    return { backgroundColor: theme.pageAreaBg };
  }
  const ip = theme.integratedPageChrome;
  const base = theme.pageAreaBg;
  if (ip.mode === "opaque") {
    return {
      backgroundColor: base,
      backdropFilter: undefined,
      WebkitBackdropFilter: undefined,
    };
  }
  const opacity = ip.pageSurfaceOpacity;
  const mix = ip.pageBackdropBlurMix;
  const rawBlur = ip.mode === "translucent" ? 0 : ip.pageBackdropBlurPx;
  const blurPx = Math.round(rawBlur * mix);
  const style: CSSProperties = {
    backgroundColor: withAlpha(base, opacity),
  };
  if (blurPx > 0) {
    const b = `blur(${blurPx}px)`;
    style.backdropFilter = b;
    style.WebkitBackdropFilter = b;
  }
  return style;
}

/**
 * WCAG-style luminance midpoint: backgrounds with L above this use black ink.
 * Raising this pushes more backgrounds toward black ink (treats more as “light”).
 */
export const INK_FLIP_LUMINANCE = 0.179;

function linearSrgbChannel(c255: number): number {
  const u = c255 / 255;
  return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for an sRGB #rrggbb hex (opaque). */
export function relativeLuminance(hex: string): number {
  const h = sanitizeHex(hex, DEFAULT_SHELL_THEME.shellBg);
  const { r, g, b } = hexToRgbComponents(h);
  const R = linearSrgbChannel(r);
  const G = linearSrgbChannel(g);
  const B = linearSrgbChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastInk(backgroundHex: string): "#000000" | "#ffffff" {
  const L = relativeLuminance(backgroundHex);
  return L > INK_FLIP_LUMINANCE ? "#000000" : "#ffffff";
}

/** Average two #rrggbb colours in 8-bit display space (simple mean). */
export function averageHex(a: string, b: string): string {
  const ha = sanitizeHex(a, DEFAULT_SHELL_THEME.shellBg);
  const hb = sanitizeHex(b, DEFAULT_SHELL_THEME.shellBg);
  const A = hexToRgbComponents(ha);
  const B = hexToRgbComponents(hb);
  const r = Math.round((A.r + B.r) / 2);
  const g = Math.round((A.g + B.g) / 2);
  const bl = Math.round((A.b + B.b) / 2);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(bl)}`;
}

export function contrastInkAverage(a: string, b: string): "#000000" | "#ffffff" {
  return contrastInk(averageHex(a, b));
}

if (import.meta.env.DEV) {
  const checks: Array<[string, "#000000" | "#ffffff"]> = [
    ["#000000", "#ffffff"],
    ["#ffffff", "#000000"],
    ["#222222", "#ffffff"],
    ["#f5f5f5", "#000000"],
  ];
  for (const [bg, ink] of checks) {
    if (contrastInk(bg) !== ink) {
      // eslint-disable-next-line no-console
      console.error("[shellTheme] contrastInk sanity check failed", { bg, expected: ink });
    }
  }
}

export { getUiFontStack, UI_FONT_OPTIONS, type UiFontId } from "./uiFontStacks";
export {
  applyUiFontVerticalMetricsToDocument,
  getUiFontVerticalTier,
  UI_FONT_VERTICAL_TIER_BY_ID,
  type UiFontVerticalTier,
} from "./uiFontVerticalTuning";
