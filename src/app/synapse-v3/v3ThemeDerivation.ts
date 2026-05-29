import {
  getShellEditorBgForPreset,
  SHELL_CUSTOM_EDITOR_THEME_ID,
  syncCustomBgFromPreset,
  writeShellCustomEditorBg,
} from "@/editor/shellMatchedEditorThemes";
import imgV3LoadingBg from "./remake-assets/v3-loading-bg.png?url";
import {
  DEFAULT_V3_THEME,
  deriveDefaultAiSidebar,
  deriveDefaultAiOverlay,
  deriveDefaultScriptHub,
  deriveScriptHubToggleFromAccent,
  type V3ThemePresetId,
  type V3ThemeScriptHub,
  type V3ThemeState,
  applyFullV3Theme,
} from "./v3Theme";

export const V3_PRESET_LABELS: Record<V3ThemePresetId, string> = {
  framework: "Framework",
  midnight: "Midnight",
  graphite: "Graphite",
  ocean: "Ocean",
  ember: "Ember",
  highContrast: "High Contrast",
  novo: "Hollywood Novo",
};

/** Built-in full theme snapshots per preset — each look shifts the whole shell, not just one surface. */
const PRESET_THEMES: Record<V3ThemePresetId, V3ThemeState> = {
  /** Framework = original V3 chrome (DEFAULT_V3_THEME); only simple tuning sliders differ. */
  framework: buildPreset({
    simple: { presetId: "framework", accentHex: "#225a7a", darkness: 50, contrast: 50 },
  }),
  midnight: buildPreset({
    shell: { windowBg: "#080808", pageBg: "#050505", contentBg: "#050505", shellBorder: "#1a1a2e" },
    topBar: { bg: "#080808", text: "#e8e8f0", mutedText: "#6a6a80", navIcon: "#c8c8e0" },
    editor: {
      workAreaBg: "#060606",
      tabBarBg: "#080808",
      tabInactiveBg: "#0c0c10",
      tabActiveBg: "#16162a",
      tabText: "#a8a8c8",
      tabBorder: "#2a2a40",
    },
    scriptList: {
      sectionHeaderBg: "#12121c",
      sectionHeaderText: "#9090b0",
      sectionIcon: "#5a5a78",
      searchBg: "#101018",
      rowHoverBg: "#1a1a28",
    },
    actionBar: {
      barBg: "#080808",
      buttonBg: "#1a1a28",
      buttonBorder: "#2a2a40",
      buttonHover: "#252538",
      buttonText: "#e8e8f0",
      buttonIcon: "#c8c8e0",
    },
    icons: { color: "#c8c8e0", muted: "#5a5a78" },
    settingsChrome: {
      sectionHeaderBg: "#12121c",
      checkboxOn: "#6a8fd4",
      sidebarAccent: "#6a8fd4",
      chipSelectedBorder: "#4a6fa5",
    },
    scriptHub: {
      searchBg: "#101018",
      cardGlassBg: "rgba(18, 18, 28, 0.2)",
    },
    accent: { primary: "#4a6fa5", primaryMuted: "#8ab4e8", selectionBorder: "#4a6fa5", focusRing: "#6a8fff" },
    simple: { presetId: "midnight", accentHex: "#4a6fa5", darkness: 88, contrast: 72 },
  }),
  graphite: buildPreset({
    shell: { windowBg: "#2e2e2e", pageBg: "#222222", contentBg: "#222222", shellBorder: "#484848" },
    topBar: { bg: "#2e2e2e", text: "#f0f0f0", mutedText: "#9a9a9a" },
    editor: {
      workAreaBg: "#1a1a1a",
      tabBarBg: "#2e2e2e",
      tabInactiveBg: "#262626",
      tabActiveBg: "#404040",
      tabText: "#d0d0d0",
    },
    scriptList: {
      sectionHeaderBg: "#383838",
      sectionHeaderText: "#c8c8c8",
      searchBg: "#303030",
      rowHoverBg: "#404040",
    },
    actionBar: {
      barBg: "#2e2e2e",
      buttonBg: "#404040",
      buttonBorder: "#484848",
      buttonHover: "#484848",
      buttonText: "#f0f0f0",
      buttonIcon: "#e0e0e0",
    },
    icons: { color: "#e0e0e0", muted: "#9a9a9a" },
    settingsChrome: {
      sectionHeaderBg: "#383838",
      checkboxOn: "#b0b0b0",
      sidebarAccent: "#c0c0c0",
      chipSelectedBorder: "#707070",
    },
    scriptHub: { searchBg: "#303030", cardGlassBg: "rgba(56, 56, 56, 0.2)" },
    accent: { primary: "#707070", primaryMuted: "#b8b8b8", selectionBorder: "#707070" },
    simple: { presetId: "graphite", accentHex: "#707070", darkness: 42, contrast: 68 },
  }),
  ocean: buildPreset({
    shell: { windowBg: "#0f1e2e", pageBg: "#0a1520", contentBg: "#0a1520", shellBorder: "#1e4a6a" },
    topBar: { bg: "#0f1e2e", text: "#e0f0ff", mutedText: "#6a90a8" },
    editor: {
      workAreaBg: "#071018",
      tabBarBg: "#0f1e2e",
      tabInactiveBg: "#0c1824",
      tabActiveBg: "#1a3a52",
      tabText: "#a8c8e0",
    },
    scriptList: {
      sectionHeaderBg: "#143040",
      sectionHeaderText: "#b7d4e8",
      sectionIcon: "#4a7a9a",
      searchBg: "#122838",
      rowHoverBg: "#1a3a52",
    },
    actionBar: {
      barBg: "#0f1e2e",
      buttonBg: "#1a3a52",
      buttonBorder: "#2a5070",
      buttonHover: "#243850",
      buttonText: "#e0f0ff",
      buttonIcon: "#a8d8f0",
    },
    icons: { color: "#a8d8f0", muted: "#4a7a9a" },
    settingsChrome: {
      sectionHeaderBg: "#143040",
      checkboxOn: "#5ab0d8",
      sidebarAccent: "#7eb8d4",
      chipSelectedBorder: "#0369a1",
    },
    scriptHub: {
      searchBg: "#122838",
      cardGlassBg: "rgba(20, 48, 64, 0.25)",
    },
    overlay: {
      backgroundMode: "image",
      imageDataUrl: imgV3LoadingBg,
      opacity: 0.4,
      mediaBlurPx: 2,
    },
    accent: { primary: "#0369a1", primaryMuted: "#7eb8d4", selectionBorder: "#0369a1", focusRing: "#4ac8ff" },
    simple: { presetId: "ocean", accentHex: "#0369a1", darkness: 75, contrast: 65 },
  }),
  ember: buildPreset({
    shell: { windowBg: "#2a1810", pageBg: "#1a1008", contentBg: "#1a1008", shellBorder: "#6a3020" },
    topBar: { bg: "#2a1810", text: "#ffe8d8", mutedText: "#a87860" },
    editor: {
      workAreaBg: "#140c08",
      tabBarBg: "#2a1810",
      tabInactiveBg: "#221408",
      tabActiveBg: "#4a2818",
      tabText: "#e8c8b0",
    },
    scriptList: {
      sectionHeaderBg: "#3d2218",
      sectionHeaderText: "#e8c0a8",
      sectionIcon: "#a86040",
      searchBg: "#301810",
      rowHoverBg: "#4a2818",
    },
    actionBar: {
      barBg: "#2a1810",
      buttonBg: "#4a2818",
      buttonBorder: "#6a3828",
      buttonHover: "#523020",
      buttonText: "#ffe8d8",
      buttonIcon: "#e8c8b0",
    },
    icons: { color: "#e8c8b0", muted: "#a86040" },
    settingsChrome: {
      sectionHeaderBg: "#3d2218",
      checkboxOn: "#e8a060",
      sidebarAccent: "#e8a87c",
      chipSelectedBorder: "#c45c26",
    },
    scriptHub: {
      searchBg: "#301810",
      cardGlassBg: "rgba(61, 34, 24, 0.25)",
    },
    accent: { primary: "#c45c26", primaryMuted: "#e8a87c", selectionBorder: "#c45c26", focusRing: "#ff8844" },
    simple: { presetId: "ember", accentHex: "#c45c26", darkness: 70, contrast: 62 },
  }),
  highContrast: buildPreset({
    shell: { windowBg: "#000000", pageBg: "#000000", contentBg: "#000000", shellBorder: "#ffffff" },
    topBar: { bg: "#000000", text: "#ffffff", mutedText: "#cccccc", navIcon: "#ffffff" },
    editor: {
      workAreaBg: "#000000",
      tabBarBg: "#000000",
      tabInactiveBg: "#111111",
      tabActiveBg: "#333333",
      tabText: "#ffffff",
      tabBorder: "#ffffff",
    },
    scriptList: {
      sectionHeaderBg: "#222222",
      sectionHeaderText: "#ffffff",
      rowText: "#ffffff",
      rowHoverBg: "#333333",
    },
    actionBar: {
      barBg: "#000000",
      buttonBg: "#333333",
      buttonBorder: "#ffffff",
      buttonHover: "#444444",
      buttonText: "#ffffff",
      buttonIcon: "#ffffff",
      attachIndicatorOn: "#5ee85e",
      attachIndicatorOff: "#e8c84a",
    },
    icons: { color: "#ffffff", muted: "#cccccc" },
    settingsChrome: {
      sectionHeaderBg: "#222222",
      checkboxOn: "#ffff00",
      checkboxOff: "#000000",
      labelText: "#ffffff",
      descriptionText: "#cccccc",
      sidebarAccent: "#ffff00",
      chipSelectedBorder: "#ffff00",
    },
    scriptHub: {
      searchBg: "#111111",
      cardGlassBg: "rgba(34, 34, 34, 0.35)",
    },
    accent: { primary: "#ffff00", primaryMuted: "#ffff99", selectionBorder: "#ffff00", focusRing: "#00ffff" },
    simple: { presetId: "highContrast", accentHex: "#ffff00", darkness: 95, contrast: 95 },
  }),
  novo: buildPreset({
    shell: { windowBg: "#101a24", pageBg: "#0c141c", contentBg: "#0c141c", shellBorder: "#305372" },
    topBar: { bg: "#101a24", text: "#fafaf9", mutedText: "#8aa8c0" },
    editor: {
      workAreaBg: "#0a1218",
      tabBarBg: "#1a2a38",
      tabInactiveBg: "#152030",
      tabActiveBg: "#243850",
      tabText: "#d6e8f8",
    },
    scriptList: {
      sectionHeaderBg: "#1e3142",
      sectionHeaderText: "#d6e8f8",
      sectionIcon: "#5080a8",
      searchBg: "#182838",
      rowHoverBg: "#243850",
    },
    actionBar: {
      barBg: "#101a24",
      buttonBg: "#213649",
      buttonBorder: "#305372",
      buttonHover: "#27425a",
      buttonText: "#fafaf9",
      buttonIcon: "#d6e8f8",
    },
    icons: { color: "#d6e8f8", muted: "#5080a8" },
    settingsChrome: {
      sectionHeaderBg: "#1e3142",
      checkboxOn: "#5ab0d8",
      sidebarAccent: "#7eb8d4",
      chipSelectedBorder: "#0369a1",
    },
    scriptHub: {
      searchBg: "#182838",
      cardGlassBg: "rgba(30, 49, 66, 0.25)",
    },
    accent: { primary: "#0369a1", primaryMuted: "#7eb8d4", selectionBorder: "#305372", focusRing: "#4ac8ff" },
    simple: { presetId: "novo", accentHex: "#0369a1", darkness: 68, contrast: 70 },
  }),
};

/** Execute / Clear / Open / Save panel colours derived from bar + label tones. */
function deriveActionBarButtons(
  barBg: string,
  hover: string,
  iconColor: string,
  labelColor: string,
): Partial<V3ThemeState["actionBar"]> {
  const buttonBg = lerpHex(barBg, "#383838", 0.72);
  const buttonBorder = lerpHex(buttonBg, "#404040", 0.55);
  const buttonHover = hover || lerpHex(buttonBg, "#404040", 0.9);
  const buttonDisabledBg = lerpHex(barBg, "#2d2d2d", 0.75);
  return {
    buttonBg,
    buttonBorder,
    buttonHover,
    buttonText: labelColor,
    buttonIcon: iconColor,
    buttonDisabledBg,
    buttonDisabledText: lerpHex(labelColor, "#8e8e8e", 0.5),
    buttonDisabledIcon: lerpHex(iconColor, "#8e8e8e", 0.45),
  };
}

function mergeScriptHub(
  base: V3ThemeState,
  partial?: Partial<V3ThemeScriptHub>,
): V3ThemeScriptHub {
  const derived = deriveDefaultScriptHub(
    base.scriptList,
    base.accent,
    base.topBar,
    base.settingsChrome,
  );
  return { ...derived, ...partial };
}

function buildPreset(partial: {
  shell?: Partial<V3ThemeState["shell"]>;
  topBar?: Partial<V3ThemeState["topBar"]>;
  editor?: Partial<V3ThemeState["editor"]>;
  scriptList?: Partial<V3ThemeState["scriptList"]>;
  aiSidebar?: Partial<V3ThemeState["aiSidebar"]>;
  aiOverlay?: Partial<V3ThemeState["aiOverlay"]>;
  scriptHub?: Partial<V3ThemeScriptHub>;
  actionBar?: Partial<V3ThemeState["actionBar"]>;
  icons?: Partial<V3ThemeState["icons"]>;
  settingsChrome?: Partial<V3ThemeState["settingsChrome"]>;
  accent?: Partial<V3ThemeState["accent"]>;
  overlay?: Partial<V3ThemeState["overlay"]>;
  simple?: Partial<V3ThemeState["simple"]>;
}): V3ThemeState {
  const base = structuredClone(DEFAULT_V3_THEME);
  const simple = { ...base.simple, ...partial.simple };
  const presetId = simple.presetId;
  const topBar = { ...base.topBar, ...partial.topBar };
  const scriptList = { ...base.scriptList, ...partial.scriptList };
  const isFrameworkDefault = presetId === "framework";
  const icons: V3ThemeState["icons"] = isFrameworkDefault && !partial.icons
    ? structuredClone(base.icons)
    : {
        color: partial.icons?.color ?? partial.topBar?.navIcon ?? topBar.navIcon,
        muted: partial.icons?.muted ?? partial.scriptList?.sectionIcon ?? scriptList.sectionIcon,
        ...partial.icons,
      };
  const hasExplicitActionBar =
    partial.actionBar != null &&
    (partial.actionBar.buttonBg != null || partial.actionBar.buttonBorder != null);
  const mergedAction = { ...base.actionBar, ...partial.actionBar };
  const actionBar: V3ThemeState["actionBar"] =
    isFrameworkDefault && !partial.actionBar
      ? structuredClone(base.actionBar)
      : hasExplicitActionBar
        ? { ...mergedAction, ...partial.actionBar }
        : {
            ...mergedAction,
            ...deriveActionBarButtons(
              mergedAction.barBg,
              mergedAction.buttonHover,
              partial.actionBar?.buttonIcon ?? icons.color,
              partial.actionBar?.buttonText ?? topBar.text,
            ),
            ...partial.actionBar,
          };
  const editorBg =
    partial.editor?.workAreaBg ?? getShellEditorBgForPreset(presetId);
  const settingsChrome = { ...base.settingsChrome, ...partial.settingsChrome };
  const accent = { ...base.accent, ...partial.accent };
  const editor: V3ThemeState["editor"] = {
    ...base.editor,
    ...partial.editor,
    workAreaBg: editorBg,
    monacoThemeId: SHELL_CUSTOM_EDITOR_THEME_ID,
  };
  const aiSidebar = {
    ...deriveDefaultAiSidebar(scriptList, settingsChrome, accent, topBar, editor),
    ...partial.aiSidebar,
  };
  const aiOverlay = {
    ...deriveDefaultAiOverlay(editor, accent, aiSidebar),
    ...partial.aiOverlay,
  };
  return {
    ...base,
    shell: { ...base.shell, ...partial.shell },
    topBar,
    editor,
    scriptList,
    aiSidebar,
    aiOverlay,
    actionBar,
    icons,
    settingsChrome,
    scriptHub: mergeScriptHub(
      {
        ...base,
        topBar,
        scriptList,
        accent,
      },
      partial.scriptHub,
    ),
    accent,
    overlay: partial.overlay ? { ...base.overlay, ...partial.overlay } : base.overlay,
    simple,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return `#${[c(r), c(g), c(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Apply a built-in preset and persist (shell + matching VS Dark editor theme). */
export function applyV3Preset(presetId: V3ThemePresetId): V3ThemeState {
  const preset = structuredClone(PRESET_THEMES[presetId] ?? PRESET_THEMES.framework);
  preset.simple = { ...preset.simple, presetId };
  const editorBg = preset.editor.workAreaBg;
  writeShellCustomEditorBg(editorBg);
  preset.editor = {
    ...preset.editor,
    monacoThemeId: SHELL_CUSTOM_EDITOR_THEME_ID,
  };
  const result = applyFullV3Theme(preset);
  void import("@/editor/shellMatchedEditorThemes").then(({ applyShellEditorBackground }) =>
    applyShellEditorBackground(editorBg, SHELL_CUSTOM_EDITOR_THEME_ID),
  );
  return result;
}

/** Derive surface grays from darkness 0 (light) .. 100 (dark). */
function surfacesFromDarkness(
  darkness: number,
): Pick<V3ThemeState, "shell" | "editor" | "scriptList" | "actionBar" | "topBar" | "aiSidebar" | "aiOverlay"> {
  const t = darkness / 100;
  const light = {
    window: "#3a3a3a",
    page: "#323232",
    panel: "#404040",
    editor: "#2a2a2a",
    tabActive: "#484848",
  };
  const dark = {
    window: "#0d0d0d",
    page: "#0a0a0a",
    panel: "#1a1a1a",
    editor: "#0f0f0f",
    tabActive: "#1a1a1a",
  };
  const def = DEFAULT_V3_THEME;
  const searchBg = lerpHex(light.tabActive, dark.tabActive, t);
  const sectionBg = lerpHex(light.panel, dark.panel, t);
  const editorBg = lerpHex(light.editor, dark.editor, t);
  return {
    shell: {
      ...def.shell,
      windowBg: lerpHex(light.window, dark.window, t),
      pageBg: lerpHex(light.page, dark.page, t),
      contentBg: lerpHex(light.page, dark.page, t),
    },
    topBar: { ...def.topBar, bg: lerpHex(light.window, dark.window, t) },
    editor: {
      ...def.editor,
      workAreaBg: editorBg,
      tabBarBg: lerpHex(light.window, dark.window, t),
      tabInactiveBg: lerpHex(light.window, dark.window, t),
      tabActiveBg: searchBg,
    },
    scriptList: {
      ...def.scriptList,
      sectionHeaderBg: sectionBg,
      searchBg,
      rowHoverBg: searchBg,
    },
    aiSidebar: {
      ...def.aiSidebar,
      panelBg: searchBg,
      headerBg: searchBg,
      messageUserBg: sectionBg,
      messageAssistantBg: editorBg,
    },
    aiOverlay: {
      ...def.aiOverlay,
      panelBg: editorBg,
      diffZoneBg: editorBg,
    },
    actionBar: {
      ...def.actionBar,
      barBg: lerpHex(light.window, dark.window, t),
      buttonBg: lerpHex(light.window, dark.window, t),
      buttonHover: searchBg,
    },
  };
}

/** Adjust text contrast 0 (muted) .. 100 (bright). */
function textFromContrast(contrast: number, accentHex: string): Pick<V3ThemeState, "topBar" | "scriptList" | "settingsChrome" | "accent"> {
  const t = contrast / 100;
  const def = DEFAULT_V3_THEME;
  const muted = "#5a5a5a";
  const bright = "#ffffff";
  const label = lerpHex(muted, bright, t);
  const desc = lerpHex("#4a4a4a", "#9a9a9a", t);
  const mutedAccent = lerpHex(accentHex, "#e8f4f8", 0.55);
  return {
    topBar: { ...def.topBar, text: label, mutedText: desc },
    scriptList: {
      ...def.scriptList,
      sectionHeaderText: lerpHex("#7a7a7a", "#d0d0d0", t),
      rowText: lerpHex("#8a8a8a", "#e0e0e0", t),
      rowMutedText: lerpHex("#4a4a4a", "#8a8a8a", t),
    },
    settingsChrome: {
      ...def.settingsChrome,
      labelText: label,
      descriptionText: desc,
      checkboxOn: mutedAccent,
    },
    accent: {
      ...def.accent,
      primary: accentHex,
      primaryMuted: mutedAccent,
      selectionBorder: accentHex,
    },
  };
}

export type V3SimplePartial = {
  presetId?: V3ThemePresetId;
  accentHex?: string;
  darkness?: number;
  contrast?: number;
};

/** Merge simple controls onto current theme (or preset base) and persist. */
export function applyV3SimplePartial(partial: V3SimplePartial): V3ThemeState {
  let base = structuredClone(DEFAULT_V3_THEME);
  const presetId = partial.presetId ?? base.simple.presetId;
  if (presetId && PRESET_THEMES[presetId]) {
    base = structuredClone(PRESET_THEMES[presetId]);
  }

  const accentHex = partial.accentHex ?? base.simple.accentHex;
  const darkness = partial.darkness ?? base.simple.darkness;
  const contrast = partial.contrast ?? base.simple.contrast;

  const surfaces = surfacesFromDarkness(darkness);
  const texts = textFromContrast(contrast, accentHex);

  /** Keep preset action button colours; only move the bottom strip with shell darkness. */
  const actionBar: V3ThemeState["actionBar"] = {
    ...base.actionBar,
    barBg: surfaces.actionBar.barBg,
  };

  const editorBg = getShellEditorBgForPreset(presetId);
  syncCustomBgFromPreset(presetId);

  const isFramework = presetId === "framework";
  const def = DEFAULT_V3_THEME;

  const next: V3ThemeState = {
    ...base,
    shell: { ...base.shell, ...surfaces.shell },
    topBar: { ...base.topBar, ...surfaces.topBar, ...texts.topBar },
    editor: {
      ...base.editor,
      tabBarBg: surfaces.editor.tabBarBg,
      tabInactiveBg: surfaces.editor.tabInactiveBg,
      tabActiveBg: surfaces.editor.tabActiveBg,
      tabText: isFramework ? def.editor.tabText : base.editor.tabText,
      workAreaBg: editorBg,
      monacoThemeId: SHELL_CUSTOM_EDITOR_THEME_ID,
    },
    scriptList: { ...base.scriptList, ...surfaces.scriptList, ...texts.scriptList },
    aiSidebar: { ...base.aiSidebar, ...surfaces.aiSidebar },
    aiOverlay: { ...base.aiOverlay, ...surfaces.aiOverlay },
    settingsChrome: isFramework
      ? {
          ...def.settingsChrome,
          labelText: texts.settingsChrome.labelText,
          descriptionText: texts.settingsChrome.descriptionText,
          checkboxOn: texts.settingsChrome.checkboxOn,
        }
      : { ...base.settingsChrome, ...texts.settingsChrome },
    scriptHub: (() => {
      const topBarMerged = { ...base.topBar, ...texts.topBar };
      const toggleDerived = base.scriptHub.toggleCustomized
        ? {}
        : deriveScriptHubToggleFromAccent(texts.accent, topBarMerged, base.settingsChrome);
      if (isFramework) {
        return { ...def.scriptHub, ...toggleDerived };
      }
      if (presetId === "novo") {
        return base.scriptHub;
      }
      return { ...base.scriptHub, ...toggleDerived };
    })(),
    accent: texts.accent,
    actionBar,
    icons: base.icons,
    overlay: isFramework ? def.overlay : base.overlay,
    simple: {
      presetId,
      accentHex,
      darkness,
      contrast,
    },
  };

  return applyFullV3Theme(next);
}

export function listV3PresetIds(): V3ThemePresetId[] {
  return Object.keys(PRESET_THEMES) as V3ThemePresetId[];
}
