import { useState, useRef, useCallback, useEffect } from "react";
import svgSettingsPaths from "../remake-assets/settings-svg-paths/v3-settings-svg-paths";
import { V3TopBar } from "./V3TopBar";
import {
  V3SectionHeader,
  V3SettingRow,
  V3SettingCheckbox,
  V3ColorRow,
  V3SliderRow,
  V3LinkButton,
  V3PageSidebar,
  V3PanelContent,
  V3ThemeFooterToggle,
  type V3SidebarItem,
} from "./v3SettingsUi";
import EditorShellThemeControls from "@/app/components/EditorShellThemeControls";
import { V3ThemeControlIcon } from "./V3ThemeControlIcon";
import {
  readV3Theme,
  writeV3Theme,
  useV3Theme,
  readV3ThemeUiAdvanced,
  writeV3ThemeUiAdvanced,
  readV3ThemeUiLiveEdit,
  writeV3ThemeUiLiveEdit,
  V3_LIVE_EDIT_CHANGED_EVENT,
  deriveScriptHubToggleFromAccent,
  V3_DEFAULT_TOP_BAR_LOGO_PRESET,
  DEFAULT_V3_THEME,
  type V3ThemeState,
} from "../v3Theme";
import {
  applyV3Preset,
  applyV3SimplePartial,
  listV3PresetIds,
  V3_PRESET_LABELS,
  type V3ThemePresetId,
} from "../v3ThemeDerivation";
import { exportV3Theme, importV3Theme, resetV3ThemeSection, type V3ThemeSectionKey } from "../v3ThemePack";
import {
  clearV3BackgroundMedia,
  setV3BackgroundImageFromFile,
  setV3BackgroundVideoFromFile,
  v3HasBackgroundMedia,
} from "../v3ThemeBackground";
import {
  resetV3LoadingImage,
  setV3LoadingImageFromFile,
  v3HasCustomLoadingImage,
} from "../v3ThemeLoading";
import { V3_DEFAULT_LOADING_IMAGE_URL } from "../v3Theme";
import {
  EDITOR_THEME_OPTIONS,
  writeStoredEditorThemeId,
  EDITOR_THEME_CHANGED_EVENT,
  SHELL_CUSTOM_EDITOR_THEME_ID,
} from "@/editor/editorThemes";
import { UI_FONT_OPTIONS, fileToDataUrl } from "@/ui/shellTheme";
import { TOP_BAR_LOGO_PRESETS } from "@/branding";
import imgV3Logo from "../remake-assets/v3-logo.png";
import type { V3Page } from "../v3PageTypes";
import { LiveEditToggleButton } from "@/app/liveEdit/LiveEditToggleButton";
import { TextLogoThemeFields } from "@/app/components/TextLogoThemeFields";
import { isEnhancedScriptListEnabled } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";

type Page = V3Page;

type SimpleSidebarId = "quick" | "colors" | "editor";
type AdvancedSidebarId =
  | "quick"
  | "branding"
  | "shell"
  | "accent"
  | "editorAdv"
  | "scriptList"
  | "aiSidebar"
  | "aiOverlay"
  | "topBar"
  | "icons"
  | "actionBar"
  | "chrome"
  | "scriptHub"
  | "background"
  | "tuning"
  | "typography"
  | "manage";

const SIMPLE_SECTION_IDS: Record<SimpleSidebarId, string> = {
  quick: "v3-theme-quick",
  colors: "v3-theme-colors",
  editor: "v3-theme-editor",
};

const ADVANCED_SECTION_IDS: Record<AdvancedSidebarId, string> = {
  quick: "v3-theme-adv-quick",
  branding: "v3-theme-branding",
  shell: "v3-theme-shell",
  accent: "v3-theme-accent",
  editorAdv: "v3-theme-editor-adv",
  scriptList: "v3-theme-script-list",
  aiSidebar: "v3-theme-ai-sidebar",
  aiOverlay: "v3-theme-ai-overlay",
  topBar: "v3-theme-topbar",
  icons: "v3-theme-icons",
  actionBar: "v3-theme-actionbar",
  chrome: "v3-theme-chrome",
  scriptHub: "v3-theme-scripthub",
  background: "v3-theme-background",
  tuning: "v3-theme-tuning",
  typography: "v3-theme-typography",
  manage: "v3-theme-manage",
};

interface ThemePageProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

function SectionReset({ section, label }: { section: V3ThemeSectionKey; label: string }) {
  return (
    <div className="mb-2">
      <V3LinkButton onClick={() => resetV3ThemeSection(section)}>Reset {label}</V3LinkButton>
    </div>
  );
}

function RgbaRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <V3SettingRow
      label={label}
      description={description}
      control={
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[28px] w-full max-w-[240px] rounded border border-solid px-2 text-[11px] text-white font-mono"
          style={{
            background: "var(--v3-editor-tab-inactive)",
            borderColor: "var(--v3-editor-tab-border)",
          }}
        />
      }
    />
  );
}

export function V3ThemePage({ currentPage, onNavigate }: ThemePageProps) {
  const theme = useV3Theme();
  const { settings: appSettings } = useAppSettings();
  const [advancedMode, setAdvancedMode] = useState(readV3ThemeUiAdvanced);
  const [liveEditEnabled, setLiveEditEnabled] = useState(readV3ThemeUiLiveEdit);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(true);

  const [activeSimple, setActiveSimple] = useState<SimpleSidebarId>("quick");
  const [activeAdvanced, setActiveAdvanced] = useState<AdvancedSidebarId>("quick");
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);

  const patch = useCallback((partial: Parameters<typeof writeV3Theme>[0]) => {
    writeV3Theme(partial);
  }, []);

  const renderBrandingImageControls = () => (
    <>
      <p className="text-[12px] mb-1" style={{ color: "var(--v3-settings-desc)" }}>
        Top bar logo
      </p>
      <select
        value={theme.branding.logoDataUrl ? "__custom__" : theme.branding.topBarLogoPreset}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__custom__") return;
          patch({ branding: { topBarLogoPreset: v, logoDataUrl: null } });
        }}
        className="mb-3 h-[28px] rounded border border-solid px-2 text-[12px] text-white w-full max-w-[280px]"
        style={{
          background: "var(--v3-editor-tab-inactive)",
          borderColor: "var(--v3-editor-tab-border)",
        }}
      >
        {theme.branding.logoDataUrl ? (
          <option value="__custom__">Custom upload (current)</option>
        ) : null}
        <option value={V3_DEFAULT_TOP_BAR_LOGO_PRESET}>Default (V3 wordmark)</option>
        {TOP_BAR_LOGO_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="mb-3 flex items-center gap-2">
        <img
          src={
            theme.branding.logoDataUrl ??
            (theme.branding.topBarLogoPreset === V3_DEFAULT_TOP_BAR_LOGO_PRESET
              ? imgV3Logo
              : TOP_BAR_LOGO_PRESETS.find((p) => p.id === theme.branding.topBarLogoPreset)?.url ??
                TOP_BAR_LOGO_PRESETS[0]?.url)
          }
          alt=""
          draggable={false}
          className="h-8 max-w-[140px] object-contain object-left border border-solid border-[#404040] bg-[#1a1a1a] px-1"
        />
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <V3LinkButton onClick={() => logoFileRef.current?.click()}>Browse custom logo…</V3LinkButton>
        {theme.branding.logoDataUrl ? (
          <V3LinkButton onClick={() => patch({ branding: { logoDataUrl: null } })}>
            Remove custom
          </V3LinkButton>
        ) : null}
      </div>
      <input
        ref={logoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void (async () => {
            setLogoErr(null);
            try {
              const dataUrl = await fileToDataUrl(f);
              patch({ branding: { logoDataUrl: dataUrl } });
            } catch (err) {
              setLogoErr(err instanceof Error ? err.message : String(err));
            }
          })();
        }}
      />
      {logoErr ? (
        <p className="text-[11px] mb-4 text-[#ff7676]">{logoErr}</p>
      ) : (
        <p className="text-[11px] mb-4" style={{ color: "var(--v3-settings-desc)" }}>
          Pick a preset or upload your own — shown on the top bar and loading screen.
        </p>
      )}
    </>
  );

  const handleAdvancedToggle = (on: boolean) => {
    setAdvancedMode(on);
    writeV3ThemeUiAdvanced(on);
  };

  const handleLiveEditToggle = (on: boolean) => {
    setLiveEditEnabled(on);
    writeV3ThemeUiLiveEdit(on);
  };

  useEffect(() => {
    const syncLiveEdit = () => setLiveEditEnabled(readV3ThemeUiLiveEdit());
    window.addEventListener(V3_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
    return () => window.removeEventListener(V3_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
  }, []);

  const sectionOrderSimple: SimpleSidebarId[] = ["quick", "colors", "editor"];
  const sectionOrderAdv: AdvancedSidebarId[] = [
    "quick",
    "branding",
    "shell",
    "accent",
    "editorAdv",
    "scriptList",
    "aiSidebar",
    "aiOverlay",
    "topBar",
    "icons",
    "actionBar",
    "chrome",
    "scriptHub",
    "background",
    "tuning",
    "typography",
    "manage",
  ];

  const handleScroll = useCallback(() => {
    if (!isUserScrolling.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const ids = advancedMode ? ADVANCED_SECTION_IDS : SIMPLE_SECTION_IDS;
    const order = advancedMode ? sectionOrderAdv : sectionOrderSimple;
    if (advancedMode) {
      let current: AdvancedSidebarId = "quick";
      for (const sid of order as AdvancedSidebarId[]) {
        const el = document.getElementById(ids[sid]);
        if (el) {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top - containerRect.top <= 40) current = sid;
        }
      }
      setActiveAdvanced(current);
    } else {
      let current: SimpleSidebarId = "quick";
      for (const sid of order as SimpleSidebarId[]) {
        const el = document.getElementById(ids[sid]);
        if (el) {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top - containerRect.top <= 40) current = sid;
        }
      }
      setActiveSimple(current);
    }
  }, [advancedMode]);

  const scrollToSimple = useCallback((id: SimpleSidebarId) => {
    const el = document.getElementById(SIMPLE_SECTION_IDS[id]);
    if (el) {
      isUserScrolling.current = false;
      setActiveSimple(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => { isUserScrolling.current = true; }, 600);
    }
  }, []);

  const scrollToAdvanced = useCallback((id: AdvancedSidebarId) => {
    const el = document.getElementById(ADVANCED_SECTION_IDS[id]);
    if (el) {
      isUserScrolling.current = false;
      setActiveAdvanced(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => { isUserScrolling.current = true; }, 600);
    }
  }, []);

  const simpleSidebarItems: V3SidebarItem<SimpleSidebarId>[] = [
    {
      id: "quick",
      label: "Presets",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p22158a00} fill="white" />
        </svg>
      ),
    },
    {
      id: "colors",
      label: "Colors",
      icon: (
        <V3ThemeControlIcon
          size={18}
          color="var(--v3-settings-sidebar-icon, #8d8d8d)"
        />
      ),
    },
    {
      id: "editor",
      label: "Editor",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p3d81380} stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
  ];

  const advancedSidebarItems: V3SidebarItem<AdvancedSidebarId>[] = [
    {
      id: "quick",
      label: "Quick Look",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p22158a00} fill="white" />
        </svg>
      ),
    },
    {
      id: "branding",
      label: "Brand",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <rect x="2" y="4" width="10" height="6" rx="1" stroke="white" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "shell",
      label: "Shell",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <rect x="1" y="1" width="12" height="12" rx="2" stroke="white" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "accent",
      label: "Accent",
      icon: (
        <V3ThemeControlIcon
          size={14}
          color="var(--v3-settings-sidebar-icon, #8d8d8d)"
        />
      ),
    },
    {
      id: "editorAdv",
      label: "Editor",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p3d81380} stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "scriptList",
      label: "Scripts",
      icon: (
        <svg viewBox="0 0 17.2 17.2" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p15678900} stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "aiSidebar",
      label: "AI chat",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="#8D8D8D" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "aiOverlay",
      label: "AI overlays",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <rect x="1" y="4" width="12" height="8" rx="1.5" stroke="#8D8D8D" strokeWidth={1.1} />
          <path d="M4 7h6M4 9.5h4" stroke="#8D8D8D" strokeWidth={1.1} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "topBar",
      label: "Top bar",
      icon: (
        <svg viewBox="0 0 18 4" width={18} height={6} fill="none">
          <rect x="0" y="0" width="18" height="4" fill="#8D8D8D" />
        </svg>
      ),
    },
    {
      id: "icons",
      label: "Icons",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p81c9680} stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "actionBar",
      label: "Actions",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <rect x="1" y="9" width="12" height="4" rx="1" stroke="#8D8D8D" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "chrome",
      label: "Panels",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p2c41aa80} fill="#8D8D8D" fillRule="evenodd" />
        </svg>
      ),
    },
    {
      id: "scriptHub",
      label: "Script Hub",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <circle cx="9" cy="9" r="7" stroke="#8D8D8D" strokeWidth={1.1} />
          <path d="M9 2a12 12 0 0 1 0 14M2 9h14" stroke="#8D8D8D" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "background",
      label: "Background",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <path d={svgSettingsPaths.p11c07600} stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "tuning",
      label: "Tuning",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <circle cx="7" cy="7" r="5" stroke="#8D8D8D" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "typography",
      label: "Type",
      icon: (
        <span className="text-[#8D8D8D] text-[11px] font-normal">Aa</span>
      ),
    },
    {
      id: "manage",
      label: "Manage",
      icon: (
        <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
          <path d="M2 7h10M7 2v10" stroke="#8D8D8D" strokeLinecap="round" strokeWidth={1.1} />
        </svg>
      ),
    },
  ];

  const onMonacoChange = (id: string) => {
    writeStoredEditorThemeId(id);
    patch({ editor: { monacoThemeId: id } });
  };

  useEffect(() => {
    const handler = () => {
      const t = readV3Theme();
      if (t.editor.monacoThemeId) {
        writeStoredEditorThemeId(t.editor.monacoThemeId);
      }
    };
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, handler);
  }, []);

  const classicMonacoOptions = EDITOR_THEME_OPTIONS.filter((o) => !o.id.startsWith("shell-"));

  const renderQuickLookGrid = (sectionId: string) => (
    <>
      <V3SectionHeader
        id={sectionId}
        icon={
          <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
            <path d={svgSettingsPaths.p22158a00} fill="white" transform="scale(0.75)" />
          </svg>
        }
        title="Quick Look"
      />
      <p className="mb-3 text-[13px]" style={{ color: "var(--v3-settings-desc)" }}>
        Full shell makeover — surfaces, accent, contrast, and a matching VS Dark editor theme.
      </p>
      <div className="grid grid-cols-3 gap-[6px] mb-6">
        {listV3PresetIds().map((id) => {
          const active = theme.simple.presetId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => applyV3Preset(id)}
              className="rounded-[4px] text-left px-3 py-[7px] transition-all border border-solid"
              style={{
                background: active ? "rgba(55,55,55,0.35)" : "var(--v3-editor-tab-inactive)",
                border: active
                  ? "1.5px solid var(--v3-accent-selection-border)"
                  : "1px solid var(--v3-editor-tab-border)",
                boxShadow: active ? "0px 0px 6px 1px rgba(34,90,122,0.25)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--v3-accent-muted)" : "var(--v3-settings-label, #c0c0c0)",
                }}
              >
                {V3_PRESET_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const syncEditorCanvasBg = useCallback(async (hex: string) => {
    const { applyShellEditorBackground } = await import("@/editor/shellMatchedEditorThemes");
    await applyShellEditorBackground(hex, SHELL_CUSTOM_EDITOR_THEME_ID);
  }, []);

  const renderShellEditorThemes = () => (
    <EditorShellThemeControls
      showV3Presets
      onThemeSelect={(id, hex) => patch({ editor: { monacoThemeId: id, workAreaBg: hex } })}
      onWrapperBgChange={(hex) => {
        patch({
          editor: {
            workAreaBg: hex,
            monacoThemeId: SHELL_CUSTOM_EDITOR_THEME_ID,
          },
        });
        void syncEditorCanvasBg(hex);
      }}
    />
  );

  const renderClassicMonacoGrid = () => (
    <>
      <p className="mb-2 mt-4 text-[13px]" style={{ color: "var(--v3-settings-desc)" }}>
        Classic Monaco themes (full syntax packs, not shell-matched).
      </p>
      <div className="grid grid-cols-3 gap-[6px] mb-4 max-h-[200px] overflow-y-auto">
        {classicMonacoOptions.map((opt) => {
          const isActive = opt.id === theme.editor.monacoThemeId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onMonacoChange(opt.id)}
              className="rounded-[4px] text-left px-2 py-1 text-[11px] border border-solid"
              style={{
                background: isActive ? "rgba(55,55,55,0.35)" : "var(--v3-editor-tab-inactive)",
                borderColor: isActive ? "var(--v3-accent-selection-border)" : "var(--v3-editor-tab-border)",
                color: isActive ? "var(--v3-accent-muted)" : "var(--v3-settings-label, #c0c0c0)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderSimpleMode = () => (
    <>
      <V3SectionHeader
        id="v3-theme-simple-branding"
        icon={<span className="text-white text-[12px]">◇</span>}
        title="Branding"
      />
      <TextLogoThemeFields
        compact
        fallbackText={DEFAULT_V3_THEME.branding.logoText}
        mode={theme.branding.logoMode}
        onModeChange={(logoMode) => patch({ branding: { logoMode } })}
        text={theme.branding.logoText}
        onTextChange={(logoText) => patch({ branding: { logoText } })}
        color={theme.branding.logoTextColor}
        onColorChange={(logoTextColor) => patch({ branding: { logoTextColor } })}
        fontId={theme.branding.logoTextFontId}
        onFontIdChange={(logoTextFontId) => patch({ branding: { logoTextFontId } })}
        sizePx={theme.branding.logoTextSizePx}
        onSizePxChange={(logoTextSizePx) => patch({ branding: { logoTextSizePx } })}
        weight={theme.branding.logoTextWeight}
        onWeightChange={(logoTextWeight) => patch({ branding: { logoTextWeight } })}
        letterSpacing={theme.branding.logoTextLetterSpacing}
        onLetterSpacingChange={(logoTextLetterSpacing) => patch({ branding: { logoTextLetterSpacing } })}
      />
      {theme.branding.logoMode === "image" ? (
        renderBrandingImageControls()
      ) : (
        <p className="text-[11px] mb-4" style={{ color: "var(--v3-settings-desc)" }}>
          Text logo replaces the image on the top bar and loading screen.
        </p>
      )}
      {renderQuickLookGrid(SIMPLE_SECTION_IDS.quick)}

      <V3SectionHeader
        id={SIMPLE_SECTION_IDS.colors}
        icon={<V3ThemeControlIcon size={14} color="#ffffff" />}
        title="Colors"
      />
      <V3ColorRow
        label="Accent"
        description="Primary highlight — tabs, selections, checkboxes, and links."
        value={theme.simple.accentHex}
        onChange={(hex) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: hex,
            darkness: theme.simple.darkness,
            contrast: theme.simple.contrast,
          })
        }
      />
      <V3SliderRow
        label="Surface darkness"
        description="Darkens window, panels, script list, and editor chrome together."
        value={theme.simple.darkness}
        min={0}
        max={100}
        formatValue={(v) => `${v}%`}
        onChange={(darkness) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: theme.simple.accentHex,
            darkness,
            contrast: theme.simple.contrast,
          })
        }
      />
      <V3SliderRow
        label="Text contrast"
        description="Brightens labels and script list text relative to backgrounds."
        value={theme.simple.contrast}
        min={0}
        max={100}
        formatValue={(v) => `${v}%`}
        onChange={(contrast) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: theme.simple.accentHex,
            darkness: theme.simple.darkness,
            contrast,
          })
        }
      />

      <V3SectionHeader
        id={SIMPLE_SECTION_IDS.editor}
        icon={
          <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
            <path d={svgSettingsPaths.p11c07600} stroke="white" strokeLinecap="round" strokeWidth={1.1} />
          </svg>
        }
        title="Editor Style"
      />
      {renderShellEditorThemes()}
      {renderClassicMonacoGrid()}
    </>
  );

  const renderAdvancedShell = (t: V3ThemeState) => (
    <>
      <SectionReset section="shell" label="shell" />
      <V3ColorRow label="Window background" description="Outer shell fill behind all pages." value={t.shell.windowBg} onChange={(v) => patch({ shell: { windowBg: v } })} />
      <V3ColorRow label="Page background" description="Settings / theme panel backdrop." value={t.shell.pageBg} onChange={(v) => patch({ shell: { pageBg: v } })} />
      <V3ColorRow label="Content background" description="Inner content wells (can differ from page)." value={t.shell.contentBg} onChange={(v) => patch({ shell: { contentBg: v } })} />
      <V3ColorRow label="Shell border" description="Rounded window edge stroke." value={t.shell.shellBorder} onChange={(v) => patch({ shell: { shellBorder: v } })} />
      <V3SliderRow label="Corner radius" description="Window corner roundness in pixels." value={t.shell.cornerRadiusPx} min={0} max={24} onChange={(v) => patch({ shell: { cornerRadiusPx: v } })} />
      <V3SettingRow
        label="Edge shadow"
        description="CSS box-shadow on the outer shell (e.g. 0px 0px 18px rgba(0,0,0,0.2))."
        control={
          <input
            type="text"
            value={t.shell.edgeShadow}
            onChange={(e) => patch({ shell: { edgeShadow: e.target.value } })}
            className="h-[28px] w-full max-w-[320px] rounded border border-solid px-2 text-[11px] text-white font-mono"
            style={{
              background: "var(--v3-editor-tab-inactive)",
              borderColor: "var(--v3-editor-tab-border)",
            }}
          />
        }
      />
    </>
  );

  const renderAdvancedMode = () => (
    <>
      {renderQuickLookGrid(ADVANCED_SECTION_IDS.quick)}

      <V3SectionHeader id={ADVANCED_SECTION_IDS.branding} title="Branding" icon={<span className="text-white text-[12px]">◇</span>} />
      <SectionReset section="branding" label="branding" />
      <TextLogoThemeFields
        fallbackText={DEFAULT_V3_THEME.branding.logoText}
        mode={theme.branding.logoMode}
        onModeChange={(logoMode) => patch({ branding: { logoMode } })}
        text={theme.branding.logoText}
        onTextChange={(logoText) => patch({ branding: { logoText } })}
        color={theme.branding.logoTextColor}
        onColorChange={(logoTextColor) => patch({ branding: { logoTextColor } })}
        fontId={theme.branding.logoTextFontId}
        onFontIdChange={(logoTextFontId) => patch({ branding: { logoTextFontId } })}
        sizePx={theme.branding.logoTextSizePx}
        onSizePxChange={(logoTextSizePx) => patch({ branding: { logoTextSizePx } })}
        weight={theme.branding.logoTextWeight}
        onWeightChange={(logoTextWeight) => patch({ branding: { logoTextWeight } })}
        letterSpacing={theme.branding.logoTextLetterSpacing}
        onLetterSpacingChange={(logoTextLetterSpacing) => patch({ branding: { logoTextLetterSpacing } })}
      />
      {theme.branding.logoMode === "image" ? (
        renderBrandingImageControls()
      ) : (
        <p className="text-[11px] mb-4" style={{ color: "var(--v3-settings-desc)" }}>
          Text logo replaces the image on the top bar and loading screen.
        </p>
      )}

      <V3SectionHeader id={ADVANCED_SECTION_IDS.shell} title="Shell & Window" icon={<span className="text-white text-[12px]">◻</span>} />
      {renderAdvancedShell(theme)}

      <V3SectionHeader id={ADVANCED_SECTION_IDS.accent} title="Accent" icon={<V3ThemeControlIcon size={14} color="#ffffff" />} />
      <SectionReset section="accent" label="accent" />
      <V3ColorRow label="Primary" description="Main accent color." value={theme.accent.primary} onChange={(v) => patch({ accent: { primary: v } })} />
      <V3ColorRow label="Primary muted" description="Softer accent for selections and checkmarks." value={theme.accent.primaryMuted} onChange={(v) => patch({ accent: { primaryMuted: v } })} />
      <V3ColorRow label="Selection border" description="Active chips and theme grid borders." value={theme.accent.selectionBorder} onChange={(v) => patch({ accent: { selectionBorder: v } })} />
      <V3ColorRow label="Focus ring" description="Keyboard focus outlines." value={theme.accent.focusRing} onChange={(v) => patch({ accent: { focusRing: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.editorAdv} title="Editor & Tabs" icon={<span className="text-white text-[12px]">⌗</span>} />
      <SectionReset section="editor" label="editor" />
      <V3ColorRow
        label="Work area"
        description="Monaco editor canvas background (shell-matched themes use VS Dark syntax)."
        value={theme.editor.workAreaBg}
        onChange={(v) => {
          patch({ editor: { workAreaBg: v, monacoThemeId: SHELL_CUSTOM_EDITOR_THEME_ID } });
          void syncEditorCanvasBg(v);
        }}
      />
      <V3ColorRow label="Tab bar" description="Row behind script tabs." value={theme.editor.tabBarBg} onChange={(v) => patch({ editor: { tabBarBg: v } })} />
      <V3ColorRow label="Tab inactive" description="Unselected tab fill." value={theme.editor.tabInactiveBg} onChange={(v) => patch({ editor: { tabInactiveBg: v } })} />
      <V3ColorRow label="Tab active" description="Selected tab fill." value={theme.editor.tabActiveBg} onChange={(v) => patch({ editor: { tabActiveBg: v } })} />
      <V3ColorRow label="Tab text" description="Tab label color." value={theme.editor.tabText} onChange={(v) => patch({ editor: { tabText: v } })} />
      <V3ColorRow label="Tab border" description="Tab outline / separator." value={theme.editor.tabBorder} onChange={(v) => patch({ editor: { tabBorder: v } })} />
      <V3SettingRow
        label="Monaco theme id"
        description="Active editor syntax theme (shell-* = VS Dark + custom bg)."
        control={
          <span className="font-mono text-[11px]" style={{ color: "var(--v3-settings-desc)" }}>
            {theme.editor.monacoThemeId}
          </span>
        }
      />
      <div className="mt-4 mb-2">{renderShellEditorThemes()}</div>
      {renderClassicMonacoGrid()}

      <V3SectionHeader id={ADVANCED_SECTION_IDS.scriptList} title="Script List" icon={<span className="text-white text-[12px]">☰</span>} />
      <SectionReset section="scriptList" label="script list" />
      {!isEnhancedScriptListEnabled(appSettings, "synapseV3") ? (
        <p className="mb-3 text-[11px] leading-snug" style={{ color: "var(--v3-settings-desc, #6b6b6b)" }}>
          Enable enhanced script list in Settings to use the V3 panel in the editor.
        </p>
      ) : null}
      <V3ColorRow label="Section header" description="Collapsible Local FS / Bookmarks bar." value={theme.scriptList.sectionHeaderBg} onChange={(v) => patch({ scriptList: { sectionHeaderBg: v } })} />
      <V3ColorRow label="Section text" description="Section title labels." value={theme.scriptList.sectionHeaderText} onChange={(v) => patch({ scriptList: { sectionHeaderText: v } })} />
      <V3ColorRow label="Section icons" description="Chevron and folder strokes." value={theme.scriptList.sectionIcon} onChange={(v) => patch({ scriptList: { sectionIcon: v } })} />
      <V3ColorRow label="Search field" description="Script search input background." value={theme.scriptList.searchBg} onChange={(v) => patch({ scriptList: { searchBg: v } })} />
      <V3ColorRow label="Search placeholder" description="Search hint text colour." value={theme.scriptList.searchPlaceholder} onChange={(v) => patch({ scriptList: { searchPlaceholder: v } })} />
      <V3ColorRow label="Row text" description="Script name color." value={theme.scriptList.rowText} onChange={(v) => patch({ scriptList: { rowText: v } })} />
      <V3ColorRow label="Row muted" description="Secondary script row text." value={theme.scriptList.rowMutedText} onChange={(v) => patch({ scriptList: { rowMutedText: v } })} />
      <V3ColorRow label="Row hover" description="Hover highlight on script rows." value={theme.scriptList.rowHoverBg} onChange={(v) => patch({ scriptList: { rowHoverBg: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.aiSidebar} title="AI Sidebar" icon={<span className="text-white text-[12px]">◆</span>} />
      <SectionReset section="aiSidebar" label="AI sidebar" />
      <V3ColorRow label="Panel background" description="SynapseAI sidebar shell." value={theme.aiSidebar.panelBg} onChange={(v) => patch({ aiSidebar: { panelBg: v } })} />
      <RgbaRow label="Panel border" description="Sidebar edge and dividers." value={theme.aiSidebar.panelBorder} onChange={(v) => patch({ aiSidebar: { panelBorder: v } })} />
      <V3ColorRow label="Header background" description="Title row behind SynapseAI label." value={theme.aiSidebar.headerBg} onChange={(v) => patch({ aiSidebar: { headerBg: v } })} />
      <V3ColorRow label="Header text" description="SynapseAI title and message body." value={theme.aiSidebar.headerText} onChange={(v) => patch({ aiSidebar: { headerText: v } })} />
      <V3ColorRow label="Header muted" description="Subtitle and inactive hints." value={theme.aiSidebar.headerMuted} onChange={(v) => patch({ aiSidebar: { headerMuted: v } })} />
      <V3ColorRow label="User message" description="Your chat bubble fill." value={theme.aiSidebar.messageUserBg} onChange={(v) => patch({ aiSidebar: { messageUserBg: v } })} />
      <V3ColorRow label="Assistant message" description="AI reply bubble fill." value={theme.aiSidebar.messageAssistantBg} onChange={(v) => patch({ aiSidebar: { messageAssistantBg: v } })} />
      <RgbaRow label="Message border" description="Chat bubble outline." value={theme.aiSidebar.messageBorder} onChange={(v) => patch({ aiSidebar: { messageBorder: v } })} />
      <V3ColorRow label="Input text" description="Compose field text." value={theme.aiSidebar.inputText} onChange={(v) => patch({ aiSidebar: { inputText: v } })} />
      <V3ColorRow label="Input placeholder" description="Compose hint text." value={theme.aiSidebar.inputPlaceholder} onChange={(v) => patch({ aiSidebar: { inputPlaceholder: v } })} />
      <V3ColorRow label="Muted icons" description="History, thinking, and utility icons." value={theme.aiSidebar.iconMuted} onChange={(v) => patch({ aiSidebar: { iconMuted: v } })} />
      <V3ColorRow label="Accent / edit badge" description="Pending edit callouts." value={theme.aiSidebar.accentText} onChange={(v) => patch({ aiSidebar: { accentText: v } })} />
      <RgbaRow label="Warning banner" description="Pending edits strip background." value={theme.aiSidebar.warningBg} onChange={(v) => patch({ aiSidebar: { warningBg: v } })} />
      <V3ColorRow label="Warning text" description="Pending edits strip text." value={theme.aiSidebar.warningText} onChange={(v) => patch({ aiSidebar: { warningText: v } })} />
      <V3ColorRow label="Error text" description="Chat error messages." value={theme.aiSidebar.errorText} onChange={(v) => patch({ aiSidebar: { errorText: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.aiOverlay} title="AI Editor Overlays" icon={<span className="text-white text-[12px]">▤</span>} />
      <SectionReset section="aiOverlay" label="AI overlays" />
      <V3ColorRow label="Panel background" description="Bottom review card fill." value={theme.aiOverlay.panelBg} onChange={(v) => patch({ aiOverlay: { panelBg: v } })} />
      <RgbaRow label="Panel border" description="Review card outline." value={theme.aiOverlay.panelBorder} onChange={(v) => patch({ aiOverlay: { panelBorder: v } })} />
      <V3ColorRow label="Header / accent text" description="Review edit title colour." value={theme.aiOverlay.headerText} onChange={(v) => patch({ aiOverlay: { headerText: v } })} />
      <RgbaRow label="Neutral button" description="Next and decline button fill." value={theme.aiOverlay.buttonBg} onChange={(v) => patch({ aiOverlay: { buttonBg: v } })} />
      <V3ColorRow label="Neutral button text" description="Next and decline labels." value={theme.aiOverlay.buttonText} onChange={(v) => patch({ aiOverlay: { buttonText: v } })} />
      <RgbaRow label="Accept button" description="Accept all button fill." value={theme.aiOverlay.acceptBg} onChange={(v) => patch({ aiOverlay: { acceptBg: v } })} />
      <V3ColorRow label="Accept text" description="Accept all label colour." value={theme.aiOverlay.acceptText} onChange={(v) => patch({ aiOverlay: { acceptText: v } })} />
      <RgbaRow label="Proposal highlight" description="Inline editor change highlight." value={theme.aiOverlay.highlightBg} onChange={(v) => patch({ aiOverlay: { highlightBg: v } })} />
      <RgbaRow label="Active highlight" description="Focused proposal highlight." value={theme.aiOverlay.highlightActiveBg} onChange={(v) => patch({ aiOverlay: { highlightActiveBg: v } })} />
      <RgbaRow label="Line highlight" description="Whole-line proposal tint." value={theme.aiOverlay.highlightLineBg} onChange={(v) => patch({ aiOverlay: { highlightLineBg: v } })} />
      <V3ColorRow label="Diff zone background" description="Inline diff block fill." value={theme.aiOverlay.diffZoneBg} onChange={(v) => patch({ aiOverlay: { diffZoneBg: v } })} />
      <RgbaRow label="Diff zone border" description="Inline diff block outline." value={theme.aiOverlay.diffZoneBorder} onChange={(v) => patch({ aiOverlay: { diffZoneBorder: v } })} />
      <V3ColorRow label="Removed text" description="Deleted lines in diffs." value={theme.aiOverlay.diffRemovedText} onChange={(v) => patch({ aiOverlay: { diffRemovedText: v } })} />
      <V3ColorRow label="Added text" description="Added lines in diffs." value={theme.aiOverlay.diffAddedText} onChange={(v) => patch({ aiOverlay: { diffAddedText: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.topBar} title="Top Bar" icon={<span className="text-white text-[12px]">▔</span>} />
      <SectionReset section="topBar" label="top bar" />
      <V3ColorRow label="Background" description="Title bar strip behind logo and nav." value={theme.topBar.bg} onChange={(v) => patch({ topBar: { bg: v } })} />
      <V3ColorRow label="Text" description="Version label and primary chrome text." value={theme.topBar.text} onChange={(v) => patch({ topBar: { text: v } })} />
      <V3ColorRow label="Muted text" description="Secondary top bar labels." value={theme.topBar.mutedText} onChange={(v) => patch({ topBar: { mutedText: v } })} />
      <V3ColorRow label="Nav icons" description="Editor / settings / theme / plugins strokes." value={theme.topBar.navIcon} onChange={(v) => patch({ topBar: { navIcon: v }, icons: { color: v } })} />
      <V3ColorRow label="Nav underline" description="Active tab indicator line." value={theme.topBar.navActiveUnderline} onChange={(v) => patch({ topBar: { navActiveUnderline: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.icons} title="Icons" icon={<span className="text-white text-[12px]">▣</span>} />
      <SectionReset section="icons" label="icons" />
      <V3ColorRow
        label="Icon colour"
        description="Universal stroke/fill for nav, tabs, script list, and action buttons."
        value={theme.icons.color}
        onChange={(v) =>
          patch({
            icons: { color: v },
            topBar: { navIcon: v },
            actionBar: { buttonIcon: v },
          })
        }
      />
      <V3ColorRow
        label="Icon muted"
        description="Secondary icons (chevrons, folder strokes, search)."
        value={theme.icons.muted}
        onChange={(v) => patch({ icons: { muted: v }, scriptList: { sectionIcon: v } })}
      />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.actionBar} title="Action Bar" icon={<span className="text-white text-[12px]">▤</span>} />
      <SectionReset section="actionBar" label="action bar" />
      <V3ColorRow label="Bar background" description="Bottom execute / clear bar." value={theme.actionBar.barBg} onChange={(v) => patch({ actionBar: { barBg: v } })} />
      <V3ColorRow label="Button fill" description="Execute, Clear, Open, Save panels." value={theme.actionBar.buttonBg} onChange={(v) => patch({ actionBar: { buttonBg: v } })} />
      <V3ColorRow label="Button border" description="Panel outline stroke." value={theme.actionBar.buttonBorder} onChange={(v) => patch({ actionBar: { buttonBorder: v } })} />
      <V3ColorRow label="Button hover" description="Hover fill on action panels." value={theme.actionBar.buttonHover} onChange={(v) => patch({ actionBar: { buttonHover: v } })} />
      <V3ColorRow label="Button text" description="Action button labels." value={theme.actionBar.buttonText} onChange={(v) => patch({ actionBar: { buttonText: v } })} />
      <V3ColorRow label="Button icons" description="Glyphs inside action panels." value={theme.actionBar.buttonIcon} onChange={(v) => patch({ actionBar: { buttonIcon: v } })} />
      <V3ColorRow label="Disabled fill" description="Execute panels when bridge is offline." value={theme.actionBar.buttonDisabledBg} onChange={(v) => patch({ actionBar: { buttonDisabledBg: v } })} />
      <V3ColorRow label="Disabled text" description="Disabled action labels." value={theme.actionBar.buttonDisabledText} onChange={(v) => patch({ actionBar: { buttonDisabledText: v } })} />
      <V3ColorRow label="Disabled icons" description="Disabled action glyphs." value={theme.actionBar.buttonDisabledIcon} onChange={(v) => patch({ actionBar: { buttonDisabledIcon: v } })} />
      <V3ColorRow label="Attach on (connected)" description="Green linked plug icon when the bridge is connected." value={theme.actionBar.attachIndicatorOn} onChange={(v) => patch({ actionBar: { attachIndicatorOn: v } })} />
      <V3ColorRow label="Attach off (disconnected)" description="Yellow separated plug icon when not connected." value={theme.actionBar.attachIndicatorOff} onChange={(v) => patch({ actionBar: { attachIndicatorOff: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.chrome} title="Settings & Theme Chrome" icon={<span className="text-white text-[12px]">⚙</span>} />
      <SectionReset section="settingsChrome" label="panels" />
      <V3ColorRow label="Section headers" description="Bar behind each settings/theme section title." value={theme.settingsChrome.sectionHeaderBg} onChange={(v) => patch({ settingsChrome: { sectionHeaderBg: v } })} />
      <V3ColorRow label="Label text" description="Primary settings labels." value={theme.settingsChrome.labelText} onChange={(v) => patch({ settingsChrome: { labelText: v } })} />
      <V3ColorRow label="Description text" description="Secondary hint text under labels." value={theme.settingsChrome.descriptionText} onChange={(v) => patch({ settingsChrome: { descriptionText: v } })} />
      <V3ColorRow label="Checkbox on" description="Enabled toggle fill." value={theme.settingsChrome.checkboxOn} onChange={(v) => patch({ settingsChrome: { checkboxOn: v } })} />
      <V3ColorRow label="Checkbox off" description="Disabled toggle track." value={theme.settingsChrome.checkboxOff} onChange={(v) => patch({ settingsChrome: { checkboxOff: v } })} />
      <V3ColorRow label="Sidebar active" description="Selected section row in settings/theme rail." value={theme.settingsChrome.sidebarActiveBg} onChange={(v) => patch({ settingsChrome: { sidebarActiveBg: v } })} />
      <V3ColorRow label="Sidebar accent" description="Active section indicator on left rail." value={theme.settingsChrome.sidebarAccent} onChange={(v) => patch({ settingsChrome: { sidebarAccent: v } })} />
      <V3ColorRow label="Control background" description="Buttons and select fields in settings/theme." value={theme.settingsChrome.controlBg} onChange={(v) => patch({ settingsChrome: { controlBg: v } })} />
      <V3ColorRow label="Control border" description="Outline on buttons and selects." value={theme.settingsChrome.controlBorder} onChange={(v) => patch({ settingsChrome: { controlBorder: v } })} />
      <V3ColorRow label="Control hover" description="Hover fill on interactive controls." value={theme.settingsChrome.controlHoverBg} onChange={(v) => patch({ settingsChrome: { controlHoverBg: v } })} />
      <V3ColorRow label="Control text" description="Text on buttons and selects." value={theme.settingsChrome.controlText} onChange={(v) => patch({ settingsChrome: { controlText: v } })} />
      <V3ColorRow label="Field background" description="Text inputs and read-only fields." value={theme.settingsChrome.fieldBg} onChange={(v) => patch({ settingsChrome: { fieldBg: v } })} />
      <V3ColorRow label="Field border" description="Input outline stroke." value={theme.settingsChrome.fieldBorder} onChange={(v) => patch({ settingsChrome: { fieldBorder: v } })} />
      <V3ColorRow label="Sidebar icon" description="Inactive rail icon colour." value={theme.settingsChrome.sidebarIcon} onChange={(v) => patch({ settingsChrome: { sidebarIcon: v } })} />
      <V3ColorRow label="Chip selected border" description="Selected option chips (e.g. action bar position)." value={theme.settingsChrome.chipSelectedBorder} onChange={(v) => patch({ settingsChrome: { chipSelectedBorder: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.scriptHub} title="Script Hub" icon={<span className="text-white text-[12px]">◉</span>} />
      <SectionReset section="scriptHub" label="script hub" />
      <V3ColorRow label="Search background" description="Script Hub search field fill." value={theme.scriptHub.searchBg} onChange={(v) => patch({ scriptHub: { searchBg: v } })} />
      <RgbaRow label="Search border" description="Search field outline." value={theme.scriptHub.searchBorder} onChange={(v) => patch({ scriptHub: { searchBorder: v } })} />
      <V3ColorRow label="Search text" description="Typed search text colour." value={theme.scriptHub.searchText} onChange={(v) => patch({ scriptHub: { searchText: v } })} />
      <V3ColorRow label="Search placeholder" description="Search hint text." value={theme.scriptHub.searchPlaceholder} onChange={(v) => patch({ scriptHub: { searchPlaceholder: v } })} />
      <V3SettingRow
        label="Source tabs"
        description="Underline tabs use Accent primary + Top bar text by default. Override below or sync back."
        control={
          <V3LinkButton
            onClick={() =>
              patch({
                scriptHub: {
                  toggleCustomized: false,
                  ...deriveScriptHubToggleFromAccent(theme.accent, theme.topBar, theme.settingsChrome),
                },
              })
            }
          >
            Use accent & top bar
          </V3LinkButton>
        }
      />
      <V3ColorRow label="Tab underline" description="Active ScriptBlox / Synapse indicator (accent primary by default)." value={theme.scriptHub.toggleIndicator} onChange={(v) => patch({ scriptHub: { toggleIndicator: v, toggleCustomized: true } })} />
      <RgbaRow label="Tab divider" description="Line under both tabs (control border by default)." value={theme.scriptHub.toggleDivider} onChange={(v) => patch({ scriptHub: { toggleDivider: v, toggleCustomized: true } })} />
      <V3ColorRow label="Active tab text" description="Selected segment label (top bar text by default)." value={theme.scriptHub.toggleActiveText} onChange={(v) => patch({ scriptHub: { toggleActiveText: v, toggleCustomized: true } })} />
      <V3ColorRow label="Inactive tab text" description="Unselected segment (top bar muted by default)." value={theme.scriptHub.toggleInactiveText} onChange={(v) => patch({ scriptHub: { toggleInactiveText: v, toggleCustomized: true } })} />
      <RgbaRow label="Card glass background" description="Frosted panel on script cards." value={theme.scriptHub.cardGlassBg} onChange={(v) => patch({ scriptHub: { cardGlassBg: v } })} />
      <RgbaRow label="Card glass border" description="Card info panel outline." value={theme.scriptHub.cardGlassBorder} onChange={(v) => patch({ scriptHub: { cardGlassBorder: v } })} />
      <RgbaRow label="Card scrim" description="Gradient scrim over card thumbnails." value={theme.scriptHub.cardScrimFrom} onChange={(v) => patch({ scriptHub: { cardScrimFrom: v } })} />
      <V3ColorRow label="Card title" description="Script name on cards." value={theme.scriptHub.cardTitleText} onChange={(v) => patch({ scriptHub: { cardTitleText: v } })} />
      <V3ColorRow label="Card subtitle" description="Game / universal line on cards." value={theme.scriptHub.cardSubtitleText} onChange={(v) => patch({ scriptHub: { cardSubtitleText: v } })} />
      <RgbaRow label="Card shadow" description="CSS box-shadow on cards." value={theme.scriptHub.cardShadow} onChange={(v) => patch({ scriptHub: { cardShadow: v } })} />
      <RgbaRow label="Execute button" description="Execute panel fill on cards." value={theme.scriptHub.cardExecuteBg} onChange={(v) => patch({ scriptHub: { cardExecuteBg: v } })} />
      <RgbaRow label="Execute disabled" description="Execute when bridge offline." value={theme.scriptHub.cardExecuteDisabledBg} onChange={(v) => patch({ scriptHub: { cardExecuteDisabledBg: v } })} />
      <RgbaRow label="Icon button" description="Open / external link buttons." value={theme.scriptHub.cardIconBtnBg} onChange={(v) => patch({ scriptHub: { cardIconBtnBg: v } })} />
      <V3ColorRow label="Status text" description="Loading and status line." value={theme.scriptHub.statusText} onChange={(v) => patch({ scriptHub: { statusText: v } })} />
      <V3ColorRow label="Error text" description="Script Hub error messages." value={theme.scriptHub.errorText} onChange={(v) => patch({ scriptHub: { errorText: v } })} />
      <V3ColorRow label="Pagination text" description="Page indicator labels." value={theme.scriptHub.paginationText} onChange={(v) => patch({ scriptHub: { paginationText: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.background} title="Background & Overlay" icon={<span className="text-white text-[12px]">▢</span>} />
      <SectionReset section="loading" label="loading screen" />
      <V3SettingRow
        label="Loading screen image"
        description="Background shown on the startup splash before the main UI appears."
        control={
          <span className="text-[11px] font-mono max-w-[220px] truncate" style={{ color: "var(--v3-settings-desc)" }}>
            {theme.loading.loadingImageFilename ??
              (theme.loading.hasStoredLoadingImage
                ? "Stored image"
                : theme.loading.imageDataUrl &&
                    theme.loading.imageDataUrl !== V3_DEFAULT_LOADING_IMAGE_URL
                  ? "Custom image"
                  : "Default sunset")}
          </span>
        }
      />
      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <label className="cursor-pointer text-[12px] underline" style={{ color: "var(--v3-accent-muted)" }}>
          Pick loading image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void setV3LoadingImageFromFile(file).then((r) => {
                  if (!r.ok) window.alert(r.error);
                });
              }
              e.target.value = "";
            }}
          />
        </label>
        {v3HasCustomLoadingImage(theme.loading) ? (
          <V3LinkButton onClick={() => resetV3LoadingImage()}>Reset to default</V3LinkButton>
        ) : null}
      </div>
      {theme.loading.imageDataUrl ? (
        <div className="mb-4 overflow-hidden rounded border border-solid border-[#404040] max-w-[280px]">
          <img
            src={theme.loading.imageDataUrl}
            alt="Loading screen preview"
            className="h-20 w-full object-cover"
            draggable={false}
          />
        </div>
      ) : null}

      <SectionReset section="overlay" label="overlay" />
      <V3SliderRow label="Overlay opacity" description="Wallpaper strength on the main editor view." value={Math.round(theme.overlay.opacity * 100)} min={0} max={100} formatValue={(v) => `${v}%`} onChange={(v) => patch({ overlay: { opacity: v / 100 } })} />
      <V3SliderRow label="Page scrim opacity" description="Dark scrim over page content when wallpaper is active." value={Math.round(theme.overlay.pageScrimOpacity * 100)} min={0} max={100} formatValue={(v) => `${v}%`} onChange={(v) => patch({ overlay: { pageScrimOpacity: v / 100 } })} />
      <V3SliderRow label="Media blur" description="Blur filter on wallpaper image/video." value={theme.overlay.mediaBlurPx} min={0} max={32} onChange={(v) => patch({ overlay: { mediaBlurPx: v } })} />
      <V3SliderRow label="Media saturate" description="Saturation filter on wallpaper (100% = normal)." value={Math.round(theme.overlay.mediaSaturate * 100)} min={0} max={200} formatValue={(v) => `${v}%`} onChange={(v) => patch({ overlay: { mediaSaturate: v / 100 } })} />
      <V3SliderRow label="Legacy blur" description="Legacy overlay blur (prefer Media blur)." value={theme.overlay.blurPx} min={0} max={32} onChange={(v) => patch({ overlay: { blurPx: v } })} />
      <V3SliderRow label="Position X" description="Horizontal wallpaper focal point." value={theme.overlay.position.x} min={0} max={100} formatValue={(v) => `${v}%`} onChange={(v) => patch({ overlay: { position: { ...theme.overlay.position, x: v } } })} />
      <V3SliderRow label="Position Y" description="Vertical wallpaper focal point." value={theme.overlay.position.y} min={0} max={100} formatValue={(v) => `${v}%`} onChange={(v) => patch({ overlay: { position: { ...theme.overlay.position, y: v } } })} />
      <V3SettingRow
        label="Overlay on top"
        description="Draw wallpaper above UI (non-interactive) instead of behind."
        control={
          <V3SettingCheckbox
            value={theme.overlay.mode === "top"}
            onChange={(on) => patch({ overlay: { mode: on ? "top" : "behind" } })}
          />
        }
      />
      <V3SettingRow
        label="Active media"
        description="Current wallpaper file stored for this theme."
        control={
          <span className="text-[11px] font-mono max-w-[220px] truncate" style={{ color: "var(--v3-settings-desc)" }}>
            {(() => {
              const o = theme.overlay;
              if (o.backgroundMode === "video" && o.hasStoredVideo) return o.videoFilename ?? "Stored video";
              if (o.backgroundMode === "image") {
                if (o.backgroundImageFilename) return o.backgroundImageFilename;
                if (o.imageDataUrl) return "Inline image";
                if (o.hasStoredBackgroundImage) return "Stored image";
              }
              return "None";
            })()}
          </span>
        }
      />
      <div className="mb-3 flex flex-wrap gap-3 items-center">
        <label className="cursor-pointer text-[12px] underline" style={{ color: "var(--v3-accent-muted)" }}>
          Pick image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void setV3BackgroundImageFromFile(file).then((r) => {
                  if (!r.ok) window.alert(r.error);
                });
              }
              e.target.value = "";
            }}
          />
        </label>
        <label className="cursor-pointer text-[12px] underline" style={{ color: "var(--v3-accent-muted)" }}>
          Pick video
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void setV3BackgroundVideoFromFile(file).then((r) => {
                  if (!r.ok) window.alert(r.error);
                });
              }
              e.target.value = "";
            }}
          />
        </label>
        {v3HasBackgroundMedia(theme.overlay) ? (
          <V3LinkButton onClick={() => clearV3BackgroundMedia()}>Clear media</V3LinkButton>
        ) : null}
      </div>
      {theme.overlay.imageDataUrl ? (
        <div className="mb-4 overflow-hidden rounded border border-solid border-[#404040] max-w-[280px]">
          <img
            src={theme.overlay.imageDataUrl}
            alt="Wallpaper preview"
            className="h-20 w-full object-cover"
            draggable={false}
          />
        </div>
      ) : null}

      <V3SectionHeader id={ADVANCED_SECTION_IDS.tuning} title="Simple Tuning" icon={<span className="text-white text-[12px]">◐</span>} />
      <V3ColorRow
        label="Accent"
        description="Same control as simple mode — updates selection borders and checkboxes."
        value={theme.simple.accentHex}
        onChange={(hex) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: hex,
            darkness: theme.simple.darkness,
            contrast: theme.simple.contrast,
          })
        }
      />
      <V3SliderRow
        label="Surface darkness"
        description="Darkens shell surfaces (preserves preset action button colours)."
        value={theme.simple.darkness}
        min={0}
        max={100}
        formatValue={(v) => `${v}%`}
        onChange={(darkness) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: theme.simple.accentHex,
            darkness,
            contrast: theme.simple.contrast,
          })
        }
      />
      <V3SliderRow
        label="Text contrast"
        description="Brightens labels and list text."
        value={theme.simple.contrast}
        min={0}
        max={100}
        formatValue={(v) => `${v}%`}
        onChange={(contrast) =>
          applyV3SimplePartial({
            presetId: theme.simple.presetId,
            accentHex: theme.simple.accentHex,
            darkness: theme.simple.darkness,
            contrast,
          })
        }
      />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.typography} title="Typography" icon={<span className="text-white text-[12px]">Aa</span>} />
      <SectionReset section="typography" label="typography" />
      <p className="text-[12px] mb-2" style={{ color: "var(--v3-settings-desc)" }}>UI font</p>
      <select
        value={theme.typography.uiFontId}
        onChange={(e) => patch({ typography: { uiFontId: e.target.value as V3ThemeState["typography"]["uiFontId"] } })}
        className="mb-3 h-[28px] rounded border border-solid px-2 text-[12px] text-white w-full max-w-[280px]"
        style={{
          background: "var(--v3-editor-tab-inactive)",
          borderColor: "var(--v3-editor-tab-border)",
        }}
      >
        {UI_FONT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <V3SliderRow label="Text size step" description="Adds px to scaled UI text." value={theme.typography.uiFontSizeStep} min={0} max={8} onChange={(v) => patch({ typography: { uiFontSizeStep: v } })} />

      <V3SectionHeader id={ADVANCED_SECTION_IDS.manage} title="Import & Reset" icon={<span className="text-white text-[12px]">↕</span>} />
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <V3LinkButton onClick={() => void exportV3Theme()}>Export theme JSON</V3LinkButton>
        <label className="cursor-pointer">
          <span className="text-[12px] underline" style={{ color: "var(--v3-accent-muted)" }}>Import theme JSON</span>
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importV3Theme(f).then((r) => { if (!r.ok) window.alert(r.error); });
              e.target.value = "";
            }}
          />
        </label>
        <V3LinkButton onClick={() => resetV3ThemeSection("all")}>Reset entire theme</V3LinkButton>
      </div>
    </>
  );

  return (
    <div className="size-full relative">
      <V3TopBar currentPage={currentPage} onNavigate={onNavigate} />

      <V3PageSidebar
        items={advancedMode ? advancedSidebarItems : simpleSidebarItems}
        activeId={advancedMode ? activeAdvanced : activeSimple}
        onSelect={(id) => (advancedMode ? scrollToAdvanced(id as AdvancedSidebarId) : scrollToSimple(id as SimpleSidebarId))}
      />

      <V3PanelContent
        scrollRef={scrollRef}
        onScroll={handleScroll}
        footer={
          <div className="flex w-full min-w-0 items-center gap-4">
            <div className="min-w-0 flex-1">
              <V3ThemeFooterToggle
                label="Advanced mode"
                description="Per-surface colors, quick look presets, and import/export."
                value={advancedMode}
                onChange={handleAdvancedToggle}
              />
            </div>
            <LiveEditToggleButton enabled={liveEditEnabled} onChange={handleLiveEditToggle} />
          </div>
        }
      >
        {advancedMode ? renderAdvancedMode() : renderSimpleMode()}
      </V3PanelContent>
    </div>
  );
}
