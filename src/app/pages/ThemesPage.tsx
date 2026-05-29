import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Slider } from "../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { cn } from "../components/ui/utils";
import SidebarThemeControlSection from "../components/SidebarThemeControlSection";
import AttachOverlayThemePreview from "../components/AttachOverlayThemePreview";
import InitScreenThemePreview from "../components/InitScreenThemePreview";
import ConfirmationDialogThemePreview from "../components/ConfirmationDialogThemePreview";
import ScriptHubThemePreview from "../components/ScriptHubThemePreview";
import { ShellFitBlock } from "../components/ShellFitBlock";
import { ShellFitLine } from "../components/ShellFitLine";
import {
  DEFAULT_SHELL_THEME,
  MAX_ABOVE_UI_BACKGROUND_OPACITY,
  readShellTheme,
  UI_FONT_SIZE_STEP_MAX,
  UI_FONT_SIZE_STEP_MIN,
  resetAttachOverlayTheme,
  resetInitTheme,
  resetShellThemeAll,
  resetShellThemeBackground,
  resetShellThemeGeneralColors,
  resetShellThemeChromeControls,
  resetShellThemeLogo,
  resetSurfaceElementsTheme,
  resetToolPanelsTheme,
  resetShellThemeTopBar,
  resetScriptHubTheme,
  resetConfirmationTheme,
  SCRIPT_HUB_THEME_CARD_RADIUS_MAX,
  SHELL_THEME_CHANGED_EVENT,
  setBackgroundImageFromFile,
  setBackgroundVideoFromFile,
  setInitBackgroundImageFromFile,
  setInitBackgroundVideoFromFile,
  setConfirmationBackgroundImageFromFile,
  setLogoFromFile,
  writeShellTheme,
  toolPanelCssVars,
  integratedPageChromeCssVars,
  DEFAULT_INTEGRATED_PAGE_CHROME,
  getUiFontStack,
  UI_FONT_OPTIONS,
  WINDOW_CORNER_RADIUS_MAX_PX,
  type BackgroundLayer,
  SHELL_HOVER_ROUTE_PATHS,
  type ShellHoverRoutePath,
  type ShellThemeState,
  type UiFontId,
  type IntegratedPageChromeMode,
} from "@/ui/shellTheme";
import { getEditorChromeNavButtonStyle } from "../scriptHub/editorChromeNavButtonStyle";
import {
  filterPublicMonacoThemeOptions,
  writeShellEditorMonacoTheme,
} from "@/editor/editorThemes";
import EditorShellThemeControls from "@/app/components/EditorShellThemeControls";
import {
  exportThemePack,
  importThemePackFromFile,
  isShellThemeCustomized,
} from "@/ui/themePack";
import { TOP_BAR_LOGO_PRESETS } from "@/branding";
import { LiveEditToggleButton } from "@/app/liveEdit/LiveEditToggleButton";
import { TextLogoThemeFields } from "@/app/components/TextLogoThemeFields";
import {
  readShellThemeUiLiveEdit,
  writeShellThemeUiLiveEdit,
  SHELL_LIVE_EDIT_CHANGED_EVENT,
} from "@/ui/shellThemeUi";

const HOVER_PANEL_ROUTE_LABELS: Record<ShellHoverRoutePath, string> = {
  "/": "Editor",
  "/script-hub": "Script Hub",
  "/console": "Console",
  "/settings": "Options",
  "/themes": "Themes",
};

function Card({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border border-[color:var(--tp-card-border)] bg-[color:var(--tp-card-bg)] p-2 shadow-[var(--tp-card-shadow)]",
        className,
      )}
    >
      <h3 className="m-0 min-w-0 font-normal leading-tight text-[color:var(--tp-card-title)]">
        <ShellFitLine basePx={15}>{title}</ShellFitLine>
      </h3>
      {hint ? (
        <div className="mb-1.5 mt-0.5 h-[44px] min-h-0 min-w-0 overflow-hidden text-[color:var(--tp-card-hint)]">
          <ShellFitBlock
            basePx={10}
            className="h-full"
            fitOptions={{ minPx: 5, lineHeight: 1.35 }}
          >
            {hint}
          </ShellFitBlock>
        </div>
      ) : (
        <div className="mb-1.5 h-0" />
      )}
      {children}
    </div>
  );
}

const browseBtn =
  "inline-flex h-[22px] min-w-[28px] shrink-0 items-center justify-center border border-[color:var(--tp-browse-border)] bg-[color:var(--tp-browse-bg)] px-2 text-[10px] text-[color:var(--tp-browse-text)] hover:bg-[color:var(--tp-browse-hover-bg)]";

const linkBtn =
  "text-left text-[10px] text-[color:var(--tp-link-text)] underline decoration-[color:var(--tp-link-decoration)] underline-offset-2 hover:text-[color:var(--tp-link-hover-text)]";

const sliderClass =
  "w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-[color:var(--tp-slider-track)] [&_[data-slot=slider-range]]:bg-[color:var(--tp-slider-range)]";

/**
 * Tier-based min-height / line-height via `html` vars (`applyUiFontVerticalMetricsToDocument` in App).
 */
/** Min-height grows with positive text-size step (font-size uses !important from shell-text-scale). */
const themesTextFieldClass =
  "shell-theme-field box-border w-full min-h-[calc(var(--shell-ui-input-min-h,48px)+var(--shell-ui-font-step-positive,0)*8px)] border border-[color:var(--tp-field-border)] bg-[color:var(--tp-field-bg)] px-2.5 py-3 text-[10px] text-[color:var(--tp-field-text)] outline-none placeholder:text-[color:var(--tp-field-placeholder)] focus-visible:border-[color:var(--tp-field-focus-border)]";

export default function ThemesPage() {
  const [theme, setTheme] = useState<ShellThemeState>(readShellTheme);
  const [liveEditEnabled, setLiveEditEnabled] = useState(readShellThemeUiLiveEdit);
  const [loadingUi, setLoadingUi] = useState<"default" | "synapseOriginal" | "synapseX">("default");
  const [banner, setBanner] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  const init =
    loadingUi === "synapseOriginal"
      ? theme.initThemeSynapseOriginal
      : loadingUi === "synapseX"
        ? theme.initThemeSynapseX
        : theme.initTheme;
  const attach = theme.attachOverlayTheme;
  const blueMonacoOptions = useMemo(
    () => filterPublicMonacoThemeOptions(theme.editorMonacoThemeId),
    [theme.editorMonacoThemeId],
  );
  const ogMonacoOptions = useMemo(
    () => filterPublicMonacoThemeOptions(theme.editorMonacoThemeIdSynapseOriginal),
    [theme.editorMonacoThemeIdSynapseOriginal],
  );
  const sxMonacoOptions = useMemo(
    () => filterPublicMonacoThemeOptions(theme.editorMonacoThemeIdSynapseX),
    [theme.editorMonacoThemeIdSynapseX],
  );
  const initBgLabel =
    init.backgroundMode === "video"
      ? init.backgroundVideoFilename ?? "Video"
      : init.backgroundMode === "image"
        ? init.backgroundImageFilename ?? "Image"
        : "None";
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const initImgRef = useRef<HTMLInputElement>(null);
  const confirmImgRef = useRef<HTMLInputElement>(null);
  const initVidRef = useRef<HTMLInputElement>(null);
  const zipImportRef = useRef<HTMLInputElement>(null);

  const sync = useCallback(() => setTheme(readShellTheme()), []);
  const canExportPack = isShellThemeCustomized(theme);

  useEffect(() => {
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
  }, [sync]);

  useEffect(() => {
    const syncLiveEdit = () => setLiveEditEnabled(readShellThemeUiLiveEdit());
    window.addEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
    return () => window.removeEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
  }, []);

  const flash = (text: string, kind: "error" | "success" = "error") => {
    setBanner({ text, kind });
    window.setTimeout(() => setBanner(null), 3200);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setBackgroundImageFromFile(f);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setBackgroundVideoFromFile(f);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setLogoFromFile(f);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const onPickInitImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setInitBackgroundImageFromFile(f, loadingUi);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const onPickThemeZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await importThemePackFromFile(f);
      if (!r.ok) flash(r.error);
      else {
        sync();
        const extra =
          r.warnings.length > 0 ? ` ${r.warnings.join(" ")}` : "";
        flash(`Theme imported.${extra}`, "success");
      }
    } finally {
      input.value = "";
    }
  };

  const onPickInitVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setInitBackgroundVideoFromFile(f, loadingUi);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const onPickConfirmationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    try {
      if (!f) return;
      const r = await setConfirmationBackgroundImageFromFile(f);
      if (!r.ok) flash(r.error);
      else sync();
    } finally {
      input.value = "";
    }
  };

  const displayBgName =
    theme.backgroundMode === "video"
      ? (theme.backgroundVideoFilename ?? "Video")
      : theme.backgroundMode === "image"
        ? (theme.backgroundImageFilename ?? "Image")
        : "None";

  const conf = theme.confirmationTheme;
  const confBgLabel =
    conf.backgroundMode === "image" ? (conf.backgroundImageFilename ?? "Image") : "None";

  const setLayer = (backgroundLayer: BackgroundLayer) => {
    const cur = readShellTheme();
    const backgroundOpacity =
      backgroundLayer === "above"
        ? Math.min(cur.backgroundOpacity, MAX_ABOVE_UI_BACKGROUND_OPACITY)
        : cur.backgroundOpacity;
    writeShellTheme({ backgroundLayer, backgroundOpacity });
    sync();
  };

  const bgOpacitySliderMax =
    theme.backgroundLayer === "above"
      ? Math.round(MAX_ABOVE_UI_BACKGROUND_OPACITY * 100)
      : 100;

  const menuFont = getUiFontStack(theme.uiFontId);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-transparent px-1 pb-1 pt-0.5"
      style={{
        ...toolPanelCssVars(theme.toolPanelsTheme),
        ...integratedPageChromeCssVars(theme.integratedPageChrome),
      }}
    >
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />
      <input
        ref={vidInputRef}
        type="file"
        accept="video/mp4,video/*"
        className="hidden"
        onChange={onPickVideo}
      />
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
      <input ref={initImgRef} type="file" accept="image/*" className="hidden" onChange={onPickInitImage} />
      <input ref={initVidRef} type="file" accept="video/mp4,video/*" className="hidden" onChange={onPickInitVideo} />
      <input
        ref={confirmImgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickConfirmationImage}
      />
      <input
        ref={zipImportRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={onPickThemeZip}
      />

      <div className="mb-1 flex shrink-0 flex-wrap items-end justify-between gap-1.5 border-b border-[color:var(--tp-page-header-border)] pb-1.5">
        <div className="min-w-0 pr-1">
          <h1 className="m-0 min-w-0 font-normal leading-none text-[color:var(--tp-page-title)]">
            <ShellFitLine basePx={24}>Theme Control Panel</ShellFitLine>
          </h1>
          <div className="m-0 mt-0.5 min-w-0 max-w-[min(100%,380px)] text-[color:var(--tp-page-subtitle)]">
            <ShellFitBlock
              basePx={10}
              fitOptions={{ fitMode: "widthOnly", minPx: 6, lineHeight: 1.35 }}
            >
              Chrome, backgrounds, and loading screen — changes apply live.
            </ShellFitBlock>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <LiveEditToggleButton
            compact
            enabled={liveEditEnabled}
            onChange={(on) => {
              setLiveEditEnabled(on);
              writeShellThemeUiLiveEdit(on);
            }}
          />
          <button
            type="button"
            disabled={!canExportPack}
            title={
              canExportPack
                ? "Download theme as a ZIP pack"
                : "Customize the theme before exporting, or use Export anyway."
            }
            className="border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={async () => {
              const r = await exportThemePack();
              if (!r.ok) flash(r.error);
              else {
                const w = r.warnings.length ? ` ${r.warnings.join(" ")}` : "";
                flash(`Theme pack downloaded.${w}`, "success");
              }
            }}
          >
            Export
          </button>
          {!canExportPack && (
            <button
              type="button"
              title="Download current theme as ZIP even when it matches defaults"
              className="border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)]"
              onClick={async () => {
                const r = await exportThemePack({ includeDefaults: true });
                if (!r.ok) flash(r.error);
                else {
                  const w = r.warnings.length ? ` ${r.warnings.join(" ")}` : "";
                  flash(`Theme pack downloaded.${w}`, "success");
                }
              }}
            >
              Export anyway
            </button>
          )}
          <button
            type="button"
            className="border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)]"
            onClick={() => zipImportRef.current?.click()}
          >
            Import
          </button>
          <button
            type="button"
            className="border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)]"
            onClick={async () => {
              await resetShellThemeAll();
              sync();
            }}
          >
            Reset all
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={cn(
            "mb-1 shrink-0 border px-1.5 py-1 text-[10px]",
            banner.kind === "error"
              ? "border-[#6a4a4a] bg-[#3d2a2a] text-[#ffb0b0]"
              : "border-[#3d6a4a] bg-[#2a3d2a] text-[#b0ffc8]",
          )}
        >
          {banner.text}
        </div>
      )}

      <Tabs
        defaultValue="background"
        className="flex min-h-0 flex-1 flex-col gap-1"
        onKeyDownCapture={(e) => {
          const el = e.target;
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement ||
            (el instanceof HTMLElement && el.isContentEditable)
          ) {
            e.stopPropagation();
          }
        }}
      >
        <div className="flex w-full shrink-0 flex-col items-center gap-1">
          <div className="flex w-full justify-center">
            <TabsList className="h-auto min-h-[30px] w-fit max-w-full flex-wrap items-center justify-center gap-0.5 rounded-sm border border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-tabs-list-bg)] p-0.5">
              <TabsTrigger
                value="background"
                className="h-auto min-h-0 max-w-[min(100%,140px)] flex-none shrink-0 rounded-none border-0 px-2.5 py-1 leading-tight text-[color:var(--tp-tab-inactive-text)] data-[state=active]:bg-[color:var(--tp-tab-active-bg)] data-[state=active]:text-[color:var(--tp-tab-active-text)] data-[state=inactive]:hover:bg-[color:var(--tp-tab-hover-bg)]"
              >
                <ShellFitLine basePx={11} className="text-[inherit]">
                  Background
                </ShellFitLine>
              </TabsTrigger>
              <TabsTrigger
                value="shell"
                className="h-auto min-h-0 max-w-[min(100%,140px)] flex-none shrink-0 rounded-none border-0 px-2.5 py-1 leading-tight text-[color:var(--tp-tab-inactive-text)] data-[state=active]:bg-[color:var(--tp-tab-active-bg)] data-[state=active]:text-[color:var(--tp-tab-active-text)] data-[state=inactive]:hover:bg-[color:var(--tp-tab-hover-bg)]"
              >
                <ShellFitLine basePx={11} className="text-[inherit]">
                  Shell &amp; chrome
                </ShellFitLine>
              </TabsTrigger>
              <TabsTrigger
                value="init"
                className="h-auto min-h-0 max-w-[min(100%,140px)] flex-none shrink-0 rounded-none border-0 px-2.5 py-1 leading-tight text-[color:var(--tp-tab-inactive-text)] data-[state=active]:bg-[color:var(--tp-tab-active-bg)] data-[state=active]:text-[color:var(--tp-tab-active-text)] data-[state=inactive]:hover:bg-[color:var(--tp-tab-hover-bg)]"
              >
                <ShellFitLine basePx={11} className="text-[inherit]">
                  Loading screen
                </ShellFitLine>
              </TabsTrigger>
              <TabsTrigger
                value="confirmation"
                className="h-auto min-h-0 max-w-[min(100%,140px)] flex-none shrink-0 rounded-none border-0 px-2.5 py-1 leading-tight text-[color:var(--tp-tab-inactive-text)] data-[state=active]:bg-[color:var(--tp-tab-active-bg)] data-[state=active]:text-[color:var(--tp-tab-active-text)] data-[state=inactive]:hover:bg-[color:var(--tp-tab-hover-bg)]"
              >
                <ShellFitLine basePx={11} className="text-[inherit]">
                  Confirmations
                </ShellFitLine>
              </TabsTrigger>
              <TabsTrigger
                value="scriptHub"
                className="h-auto min-h-0 max-w-[min(100%,140px)] flex-none shrink-0 rounded-none border-0 px-2.5 py-1 leading-tight text-[color:var(--tp-tab-inactive-text)] data-[state=active]:bg-[color:var(--tp-tab-active-bg)] data-[state=active]:text-[color:var(--tp-tab-active-text)] data-[state=inactive]:hover:bg-[color:var(--tp-tab-hover-bg)]"
              >
                <ShellFitLine basePx={11} className="text-[inherit]">
                  Script Hub
                </ShellFitLine>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-sm border border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-tabs-list-bg)] px-1.5 py-0.5">
            <span className="whitespace-nowrap text-[10px] text-[color:var(--tp-page-subtitle)]">App font</span>
            <Select
              value={theme.uiFontId}
              onValueChange={(v) => {
                writeShellTheme({ uiFontId: v as UiFontId });
                sync();
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-auto min-h-[calc(var(--shell-ui-select-min-h-app,38px)+var(--shell-ui-font-step-positive,0)*6px)] w-[min(100%,168px)] min-w-[140px] rounded-none border-0 bg-[#4a4a4a] px-[6px] py-[5px] text-white shadow-none ring-0 data-[size=sm]:h-auto data-[size=sm]:min-h-[calc(var(--shell-ui-select-min-h-app,38px)+var(--shell-ui-font-step-positive,0)*6px)] focus-visible:border-0 focus-visible:ring-0 [&_svg]:size-[10px] [&_svg]:text-white/80"
              >
                <SelectValue className="text-[11px] font-normal leading-snug text-white" />
              </SelectTrigger>
              <SelectContent
                className="max-h-[min(380px,50vh)] overflow-y-auto rounded-none border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] text-[color:var(--tp-toolbar-btn-text)]"
                style={{ fontFamily: menuFont }}
              >
                {UI_FONT_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    style={{ fontFamily: opt.stack }}
                    className="cursor-pointer rounded-none text-[11px] text-white focus:bg-[#4a4a4a] focus:text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="whitespace-nowrap text-[10px] text-[#b0b0b0]">Text size</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Smaller (global)"
                disabled={theme.uiFontSizeStep <= UI_FONT_SIZE_STEP_MIN}
                className="flex h-[22px] min-w-[22px] items-center justify-center border border-[color:var(--tp-browse-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1 text-[12px] leading-none text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  writeShellTheme({
                    uiFontSizeStep: Math.max(UI_FONT_SIZE_STEP_MIN, theme.uiFontSizeStep - 1),
                  });
                  sync();
                }}
              >
                −
              </button>
              <span
                className="min-w-[2ch] text-center text-[11px] font-normal tabular-nums leading-none text-white"
                title="Each step adds 1px to text that uses pixel font sizes; window chrome and spacing stay the same."
              >
                {theme.uiFontSizeStep > 0 ? `+${theme.uiFontSizeStep}` : `${theme.uiFontSizeStep}`}
              </span>
              <button
                type="button"
                title="Larger (global)"
                disabled={theme.uiFontSizeStep >= UI_FONT_SIZE_STEP_MAX}
                className="flex h-[22px] min-w-[22px] items-center justify-center border border-[color:var(--tp-browse-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-1 text-[12px] leading-none text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  writeShellTheme({
                    uiFontSizeStep: Math.min(UI_FONT_SIZE_STEP_MAX, theme.uiFontSizeStep + 1),
                  });
                  sync();
                }}
              >
                +
              </button>
              <button
                type="button"
                title="Reset text size to default"
                className="ml-0.5 border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-card-bg)] px-1 py-0.5 text-[9px] text-[color:var(--tp-chip-title)] hover:bg-[color:var(--tp-toolbar-btn-bg)]"
                onClick={() => {
                  writeShellTheme({ uiFontSizeStep: 0 });
                  sync();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <TabsContent
          value="background"
          className="synapse-scroll mt-0 min-h-0 flex-1 overflow-y-auto pr-0.5 focus-visible:outline-none"
        >
          <div className="mb-2 rounded-sm border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-2 py-1.5 shadow-[var(--tp-section-inset-shadow)]">
            <p className="m-0 text-[10px] font-medium leading-snug text-[color:var(--tp-section-title)]">
              Wallpaper vs route column
            </p>
            <p className="mt-1 text-[9px] leading-snug text-[color:var(--tp-section-body)]">
              The first cards control the <span className="text-[color:var(--tp-card-title)]">full-shell wallpaper</span>{" "}
              (image, video, stacking, and opacity). The{" "}
              <span className="text-[color:var(--tp-card-title)]">page column</span> card appears only when the layer is
              Integrated and media is set — it tints and blurs the main content strip (editor, Themes, etc.), not the
              wallpaper file itself.
            </p>
          </div>
          <div className="grid gap-1.5 pb-1 sm:grid-cols-2">
            <Card
              title="Background media"
              hint="Wallpaper blur and saturation apply to the image or video only (Integrated and Above layers). Large images use IndexedDB (~25MB); videos stay capped at 40MB."
            >
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                <div className="min-w-0 flex-1 truncate border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] px-2 py-1  text-[10px] text-white">
                  {displayBgName}
                </div>
                <button type="button" className={browseBtn} onClick={() => imgInputRef.current?.click()}>
                  Image…
                </button>
                <button type="button" className={browseBtn} onClick={() => vidInputRef.current?.click()}>
                  Video…
                </button>
              </div>
              {(theme.backgroundMode === "image" || theme.backgroundMode === "video") && (
                <>
                  <p className="mb-1 mt-2 text-[10px] text-[#b0b0b0]">
                    Wallpaper blur {theme.backgroundMediaBlurPx}px
                  </p>
                  <Slider
                    className={cn("mb-2", sliderClass)}
                    value={[theme.backgroundMediaBlurPx]}
                    min={0}
                    max={32}
                    step={1}
                    onValueChange={(v) => {
                      const px = v[0] ?? 0;
                      writeShellTheme({ backgroundMediaBlurPx: px });
                      sync();
                    }}
                  />
                  <p className="mb-1 text-[10px] text-[#b0b0b0]">
                    Wallpaper saturation {Math.round(theme.backgroundMediaSaturate * 100)}%
                  </p>
                  <Slider
                    className={cn("mb-2", sliderClass)}
                    value={[Math.round(theme.backgroundMediaSaturate * 100)]}
                    min={20}
                    max={200}
                    step={1}
                    onValueChange={(v) => {
                      const pct = v[0] ?? 100;
                      writeShellTheme({ backgroundMediaSaturate: pct / 100 });
                      sync();
                    }}
                  />
                </>
              )}
              <button
                type="button"
                className={linkBtn}
                onClick={async () => {
                  await resetShellThemeBackground();
                  sync();
                }}
              >
                Back to default (background)
              </button>
            </Card>

            <Card
              title="Layer & opacity"
              hint="Integrated draws wallpaper behind the whole shell; the top bar and sidebar show it through automatically. The main route column can be tinted separately below. Above UI adds a film over routes instead."
            >
              <p className="mb-1.5  text-[10px] text-[#b0b0b0]">Stacking</p>
              <div className="mb-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setLayer("integrated")}
                  className={`flex-1 border px-2 py-1.5  text-[10px] ${
                    theme.backgroundLayer === "integrated"
                      ? "border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-tab-active-bg)] text-[color:var(--tp-tab-active-text)]"
                      : "border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-chip-bg)] text-[color:var(--tp-tab-inactive-text)] hover:bg-[color:var(--tp-tab-hover-bg)]"
                  }`}
                >
                  Integrated
                </button>
                <button
                  type="button"
                  onClick={() => setLayer("above")}
                  className={`flex-1 border px-2 py-1.5  text-[10px] ${
                    theme.backgroundLayer === "above"
                      ? "border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-tab-active-bg)] text-[color:var(--tp-tab-active-text)]"
                      : "border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-chip-bg)] text-[color:var(--tp-tab-inactive-text)] hover:bg-[color:var(--tp-tab-hover-bg)]"
                  }`}
                >
                  Above UI
                </button>
              </div>
              <p className="mb-1  text-[10px] text-[#b0b0b0]">
                Opacity {Math.round(theme.backgroundOpacity * 100)}%
                {theme.backgroundLayer === "above"
                  ? ` (max ${Math.round(MAX_ABOVE_UI_BACKGROUND_OPACITY * 100)}% — keeps content visible)`
                  : ""}
              </p>
              <Slider
                className={cn("mb-2", sliderClass)}
                value={[Math.min(Math.round(theme.backgroundOpacity * 100), bgOpacitySliderMax)]}
                min={0}
                max={bgOpacitySliderMax}
                step={1}
                onValueChange={(v) => {
                  const pct = Math.min(v[0] ?? bgOpacitySliderMax, bgOpacitySliderMax);
                  writeShellTheme({ backgroundOpacity: pct / 100 });
                  sync();
                }}
              />
              {theme.backgroundLayer === "above" && (
                <p className="mt-2  text-[9px] leading-snug text-[#909090]">
                  Above UI draws a full-shell film over routes; chrome stays on top for clicks. Opacity is
                  capped at {Math.round(MAX_ABOVE_UI_BACKGROUND_OPACITY * 100)}% so the workspace never
                  goes fully opaque.
                </p>
              )}
            </Card>

            {theme.backgroundLayer === "integrated" && theme.backgroundMode !== "none" ? (
            <Card
              title="Integrated page column"
              hint="Controls the main content strip (editor, Script Hub, Themes, Options): tint, frosted blur, blur strength, and how opaque the page UI reads over the wallpaper. Top bar and sidebar are unchanged; use Background media for wallpaper blur."
              className="sm:col-span-2"
            >
              <p className="mb-1.5 text-[10px] text-[#b0b0b0]">Mode</p>
              <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {(
                  [
                    ["opaque", "Opaque"],
                    ["translucent", "Translucent"],
                    ["glass", "Glass"],
                    ["blur", "Blur"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      const presets: Record<
                        IntegratedPageChromeMode,
                        {
                          pageSurfaceOpacity: number;
                          pageBackdropBlurPx: number;
                          pageBackdropBlurMix: number;
                        }
                      > = {
                        opaque: { pageSurfaceOpacity: 1, pageBackdropBlurPx: 0, pageBackdropBlurMix: 1 },
                        translucent: {
                          pageSurfaceOpacity: 0.88,
                          pageBackdropBlurPx: 0,
                          pageBackdropBlurMix: 1,
                        },
                        glass: { pageSurfaceOpacity: 0.42, pageBackdropBlurPx: 18, pageBackdropBlurMix: 1 },
                        blur: { pageSurfaceOpacity: 0.72, pageBackdropBlurPx: 22, pageBackdropBlurMix: 1 },
                      };
                      const p = presets[id];
                      writeShellTheme({
                        integratedPageChrome: {
                          ...readShellTheme().integratedPageChrome,
                          mode: id,
                          ...p,
                        },
                      });
                      sync();
                    }}
                    className={`border px-2 py-1.5 text-[10px] ${
                      theme.integratedPageChrome.mode === id
                        ? "border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-tab-active-bg)] text-[color:var(--tp-tab-active-text)]"
                        : "border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-chip-bg)] text-[color:var(--tp-tab-inactive-text)] hover:bg-[color:var(--tp-tab-hover-bg)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Surface opacity {Math.round(theme.integratedPageChrome.pageSurfaceOpacity * 100)}%
              </p>
              <Slider
                className={cn("mb-2", sliderClass)}
                value={[Math.round(theme.integratedPageChrome.pageSurfaceOpacity * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  const pct = v[0] ?? 88;
                  const cur = readShellTheme();
                  writeShellTheme({
                    integratedPageChrome: {
                      ...cur.integratedPageChrome,
                      pageSurfaceOpacity: pct / 100,
                    },
                  });
                  sync();
                }}
              />
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Backdrop blur {theme.integratedPageChrome.pageBackdropBlurPx}px
              </p>
              <Slider
                className={cn("mb-2", sliderClass)}
                value={[theme.integratedPageChrome.pageBackdropBlurPx]}
                min={0}
                max={48}
                step={1}
                onValueChange={(v) => {
                  const px = v[0] ?? 0;
                  const cur = readShellTheme();
                  writeShellTheme({
                    integratedPageChrome: {
                      ...cur.integratedPageChrome,
                      pageBackdropBlurPx: px,
                    },
                  });
                  sync();
                }}
              />
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Blur strength {Math.round(theme.integratedPageChrome.pageBackdropBlurMix * 100)}%
              </p>
              <p className="mb-1 text-[9px] leading-snug text-[#909090]">
                Scales the frosted blur on the route column (separate from tint opacity above).
              </p>
              <Slider
                className={cn("mb-2", sliderClass)}
                value={[Math.round(theme.integratedPageChrome.pageBackdropBlurMix * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  const pct = v[0] ?? 100;
                  const cur = readShellTheme();
                  writeShellTheme({
                    integratedPageChrome: {
                      ...cur.integratedPageChrome,
                      pageBackdropBlurMix: pct / 100,
                    },
                  });
                  sync();
                }}
              />
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Page &amp; tool UI opacity {Math.round(theme.integratedPageChrome.pageRouteSurfacesOpacity * 100)}%
              </p>
              <p className="mb-1 text-[9px] leading-snug text-[#909090]">
                Fades editor, Themes, Options, and other route content over the wallpaper (1 = solid).
              </p>
              <Slider
                className={cn("mb-2", sliderClass)}
                value={[Math.round(theme.integratedPageChrome.pageRouteSurfacesOpacity * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  const pct = v[0] ?? 100;
                  const cur = readShellTheme();
                  writeShellTheme({
                    integratedPageChrome: {
                      ...cur.integratedPageChrome,
                      pageRouteSurfacesOpacity: pct / 100,
                    },
                  });
                  sync();
                }}
              />
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  writeShellTheme({ integratedPageChrome: { ...DEFAULT_INTEGRATED_PAGE_CHROME } });
                  sync();
                }}
              >
                Reset page column
              </button>
            </Card>
            ) : null}

            <Card title="Position" hint="Object position for image and video." className="sm:col-span-2">
              <div className="grid max-w-lg gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1  text-[10px] text-[#b0b0b0]">
                    Horizontal {theme.backgroundPosition.x}%
                  </p>
                  <Slider
                    className={sliderClass}
                    value={[theme.backgroundPosition.x]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      const cur = readShellTheme();
                      writeShellTheme({
                        backgroundPosition: { ...cur.backgroundPosition, x: v[0] ?? 50 },
                      });
                      sync();
                    }}
                  />
                </div>
                <div>
                  <p className="mb-1  text-[10px] text-[#b0b0b0]">
                    Vertical {theme.backgroundPosition.y}%
                  </p>
                  <Slider
                    className={sliderClass}
                    value={[theme.backgroundPosition.y]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      const cur = readShellTheme();
                      writeShellTheme({
                        backgroundPosition: { ...cur.backgroundPosition, y: v[0] ?? 50 },
                      });
                      sync();
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`${linkBtn} mt-2`}
                onClick={() => {
                  writeShellTheme({ backgroundPosition: { ...DEFAULT_SHELL_THEME.backgroundPosition } });
                  sync();
                }}
              >
                Reset position to center
              </button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="shell"
          className="synapse-scroll mt-0 min-h-0 flex-1 overflow-y-auto pr-0.5 focus-visible:outline-none"
        >
          <div className="grid gap-1.5 pb-1 sm:grid-cols-2">
            <Card
              title="Top bar logo"
              hint="Pick a bundled mark from the list or upload your own — same asset on the main bar and loading header (~175×37 for custom uploads)."
            >
              <TextLogoThemeFields
                compact
                fallbackText={DEFAULT_SHELL_THEME.logoText}
                mode={theme.logoMode}
                onModeChange={(logoMode) => {
                  writeShellTheme({ logoMode });
                  sync();
                }}
                text={theme.logoText}
                onTextChange={(logoText) => {
                  writeShellTheme({ logoText });
                  sync();
                }}
                color={theme.logoTextColor}
                onColorChange={(logoTextColor) => {
                  writeShellTheme({ logoTextColor });
                  sync();
                }}
                fontId={theme.logoTextFontId}
                onFontIdChange={(logoTextFontId) => {
                  writeShellTheme({ logoTextFontId });
                  sync();
                }}
                sizePx={theme.logoTextSizePx}
                onSizePxChange={(logoTextSizePx) => {
                  writeShellTheme({ logoTextSizePx });
                  sync();
                }}
                weight={theme.logoTextWeight}
                onWeightChange={(logoTextWeight) => {
                  writeShellTheme({ logoTextWeight });
                  sync();
                }}
                letterSpacing={theme.logoTextLetterSpacing}
                onLetterSpacingChange={(logoTextLetterSpacing) => {
                  writeShellTheme({ logoTextLetterSpacing });
                  sync();
                }}
              />
              {theme.logoMode === "image" ? (
              <>
              <p className="mb-1 text-[10px] text-[#909090]">Logo preset</p>
              <Select
                value={theme.logoDataUrl ? "__custom__" : theme.topBarLogoPreset}
                onValueChange={(v) => {
                  if (v === "__custom__") return;
                  writeShellTheme({ logoDataUrl: null, topBarLogoPreset: v });
                  sync();
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="mb-2 h-auto min-h-[calc(var(--shell-ui-select-min-h-app,38px)+var(--shell-ui-font-step-positive,0)*6px)] w-full rounded-none border border-[color:var(--tp-tabs-list-border)] bg-[#4a4a4a] px-2 py-1.5 text-white shadow-none ring-0 data-[size=sm]:h-auto focus-visible:ring-0 [&_svg]:size-[10px] [&_svg]:text-white/80"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {!theme.logoDataUrl ? (
                      <img
                        src={
                          TOP_BAR_LOGO_PRESETS.find((x) => x.id === theme.topBarLogoPreset)?.url ??
                          TOP_BAR_LOGO_PRESETS[0]?.url
                        }
                        alt=""
                        draggable={false}
                        className="h-7 max-w-[100px] shrink-0 object-contain object-left"
                      />
                    ) : null}
                    <SelectValue
                      placeholder="Preset"
                      className="min-w-0 truncate text-[11px] font-normal leading-snug text-white"
                    />
                  </div>
                </SelectTrigger>
                <SelectContent
                  className="max-h-[min(380px,55vh)] overflow-y-auto rounded-none border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] text-[color:var(--tp-toolbar-btn-text)]"
                  style={{ fontFamily: menuFont }}
                >
                  <SelectItem
                    value="__custom__"
                    textValue="Custom upload"
                    disabled={!theme.logoDataUrl}
                    className="cursor-pointer rounded-none text-[11px] text-white focus:bg-[#4a4a4a] focus:text-white"
                  >
                    Custom upload (current)
                  </SelectItem>
                  {TOP_BAR_LOGO_PRESETS.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      textValue={p.label}
                      className="cursor-pointer rounded-none text-[11px] text-white focus:bg-[#4a4a4a] focus:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <img
                          src={p.url}
                          alt=""
                          draggable={false}
                          className="h-6 max-w-[88px] object-contain object-left"
                        />
                        <span className="flex min-w-0 flex-col gap-0.5 text-left leading-tight">
                          <span>{p.label}</span>
                          <span className="text-[9px] font-normal text-white/65">{p.description}</span>
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="flex min-h-[calc(var(--shell-ui-logo-strip-min-h,40px)+var(--shell-ui-font-step-positive,0)*6px)] min-w-0 flex-1 items-center truncate border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] px-2 py-2 text-[10px] leading-[1.45] text-white">
                  {theme.logoDataUrl
                    ? "Custom image — replace with Browse or pick a preset above"
                    : `${TOP_BAR_LOGO_PRESETS.find((x) => x.id === theme.topBarLogoPreset)?.label ?? "Preset"} — or upload`}
                </div>
                <button type="button" className={browseBtn} onClick={() => logoInputRef.current?.click()}>
                  Browse…
                </button>
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetShellThemeLogo();
                  sync();
                }}
              >
                Back to default (wordmark logo)
              </button>
              </>
              ) : null}
            </Card>

            <Card title="Top bar gradient">
              <div className="mb-1.5 flex flex-wrap gap-2">
                <label className="flex flex-col gap-1">
                  <span className=" text-[9px] text-[#b0b0b0]">From</span>
                  <input
                    type="color"
                    value={theme.topBarFrom}
                    onChange={(e) => {
                      writeShellTheme({ topBarFrom: e.target.value });
                      sync();
                    }}
                    className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className=" text-[9px] text-[#b0b0b0]">To</span>
                  <input
                    type="color"
                    value={theme.topBarTo}
                    onChange={(e) => {
                      writeShellTheme({ topBarTo: e.target.value });
                      sync();
                    }}
                    className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                  />
                </label>
              </div>
              <div
                className="mb-1.5 h-5 w-full max-w-[180px] border border-[#464646]"
                style={{
                  background: `linear-gradient(to bottom, ${theme.topBarFrom}, ${theme.topBarTo})`,
                }}
              />
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetShellThemeTopBar();
                  sync();
                }}
              >
                Back to default (top bar)
              </button>
            </Card>

            <Card
              title="Route surfaces"
              hint="Editor script list, Monaco surround, console panel — one shared palette (Script Hub cards stay under Script Hub)."
              className="sm:col-span-2"
            >
              <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    ["Editor work area", "editorWorkAreaBackground"],
                    ["Panel body", "surfacePanelBackground"],
                    ["Panel border", "surfacePanelBorder"],
                    ["Panel header", "surfaceHeaderBackground"],
                    ["Header border", "surfaceHeaderBorder"],
                    ["Header label", "surfaceHeaderText"],
                    ["List divider", "surfaceListDivider"],
                    ["List text", "surfaceListText"],
                    ["List hover", "surfaceListHoverBackground"],
                    ["List focus ring", "surfaceListFocusRing"],
                    ["Script search", "surfaceSearchBackground"],
                    ["Search placeholder", "surfaceSearchPlaceholder"],
                    ["Section icon", "surfaceSectionIcon"],
                    ["Row muted", "surfaceRowMutedText"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={theme.surfaceElementsTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          surfaceElementsTheme: {
                            ...cur.surfaceElementsTheme,
                            [key]: e.target.value,
                          },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetSurfaceElementsTheme();
                  sync();
                }}
              >
                Back to default (route surfaces)
              </button>
            </Card>

            <Card
              title="Tool panel chrome"
              hint="Options, Theme Control, tabs, sliders, browse buttons, and option rows — one palette for util UI."
              className="sm:col-span-2"
            >
              <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(
                  [
                    ["Page header rule", "pageHeaderBorder"],
                    ["Page title", "pageTitle"],
                    ["Page subtitle", "pageSubtitle"],
                    ["Card background", "cardBackground"],
                    ["Card border", "cardBorder"],
                    ["Card title", "cardTitle"],
                    ["Card hint", "cardHint"],
                    ["Section background", "sectionBackground"],
                    ["Section border", "sectionBorder"],
                    ["Section title", "sectionTitle"],
                    ["Section body", "sectionBody"],
                    ["Tabs list bg", "tabsListBackground"],
                    ["Tabs list border", "tabsListBorder"],
                    ["Tab inactive text", "tabInactiveText"],
                    ["Tab active bg", "tabActiveBackground"],
                    ["Tab active text", "tabActiveText"],
                    ["Tab hover bg", "tabHoverBackground"],
                    ["Toolbar border", "toolbarButtonBorder"],
                    ["Toolbar bg", "toolbarButtonBackground"],
                    ["Toolbar hover", "toolbarButtonHoverBackground"],
                    ["Toolbar text", "toolbarButtonText"],
                    ["Link text", "linkText"],
                    ["Link underline", "linkDecoration"],
                    ["Link hover", "linkHoverText"],
                    ["Slider track", "sliderTrackBackground"],
                    ["Slider fill", "sliderRangeBackground"],
                    ["Browse border", "browseButtonBorder"],
                    ["Browse bg", "browseButtonBackground"],
                    ["Browse hover", "browseButtonHoverBackground"],
                    ["Browse text", "browseButtonText"],
                    ["Field border", "fieldBorder"],
                    ["Field bg", "fieldBackground"],
                    ["Field text", "fieldText"],
                    ["Field placeholder", "fieldPlaceholder"],
                    ["Field focus", "fieldFocusBorder"],
                    ["Chip selected border", "chipSelectedBorder"],
                    ["Chip selected bg", "chipSelectedBackground"],
                    ["Chip border", "chipInactiveBorder"],
                    ["Chip bg", "chipInactiveBackground"],
                    ["Chip hover", "chipInactiveHoverBackground"],
                    ["Chip label", "chipTitleText"],
                    ["Chip muted", "chipMutedText"],
                    ["Color well border", "colorWellBorder"],
                    ["Color well bg", "colorWellBackground"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[color:var(--tp-page-subtitle)]">{label}</span>
                    <input
                      type="color"
                      value={theme.toolPanelsTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          toolPanelsTheme: {
                            ...cur.toolPanelsTheme,
                            [key]: e.target.value,
                          },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] text-[color:var(--tp-page-subtitle)]">Card drop shadow (CSS)</span>
                  <input
                    type="text"
                    spellCheck={false}
                    className={themesTextFieldClass}
                    value={theme.toolPanelsTheme.cardBoxShadow}
                    onChange={(e) => {
                      const cur = readShellTheme();
                      writeShellTheme({
                        toolPanelsTheme: { ...cur.toolPanelsTheme, cardBoxShadow: e.target.value },
                      });
                      sync();
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] text-[color:var(--tp-page-subtitle)]">Section inset shadow (CSS)</span>
                  <input
                    type="text"
                    spellCheck={false}
                    className={themesTextFieldClass}
                    value={theme.toolPanelsTheme.sectionInsetShadow}
                    onChange={(e) => {
                      const cur = readShellTheme();
                      writeShellTheme({
                        toolPanelsTheme: { ...cur.toolPanelsTheme, sectionInsetShadow: e.target.value },
                      });
                      sync();
                    }}
                  />
                </label>
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetToolPanelsTheme();
                  sync();
                }}
              >
                Back to default (tool panels)
              </button>
            </Card>

            <Card title="General colours" className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Main shell", "shellBg", theme.shellBg],
                    ["Sidebar", "sidebarBg", theme.sidebarBg],
                    ["Page area", "pageAreaBg", theme.pageAreaBg],
                    ["Sidebar nav (inactive)", "sidebarNavInactiveBg", theme.sidebarNavInactiveBg],
                    ["Sidebar nav (active)", "sidebarNavActiveBg", theme.sidebarNavActiveBg],
                  ] as const
                ).map(([label, key, val]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className=" text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        writeShellTheme({ [key]: e.target.value } as Partial<ShellThemeState>);
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <div className="mb-3 mt-2 max-w-md" data-shell-text-no-step>
                <p className="mb-1 text-[10px] font-medium text-[#b0b0b0]">
                  Window corner radius (px)
                </p>
                <p className="mb-1.5 text-[9px] leading-snug text-[#888]">
                  Rounds the main shell edge (desktop app uses this instead of the Windows 11 default window curve, which stays off). 0 = square.
                </p>
                <Slider
                  value={[theme.windowCornerRadiusPx]}
                  min={0}
                  max={WINDOW_CORNER_RADIUS_MAX_PX}
                  step={1}
                  onValueChange={(v) => {
                    const px = Math.round(v[0] ?? 0);
                    writeShellTheme({
                      windowCornerRadiusPx: Math.min(WINDOW_CORNER_RADIUS_MAX_PX, Math.max(0, px)),
                    });
                    sync();
                  }}
                />
                <p className="mt-1 text-[9px] text-[#888]">{theme.windowCornerRadiusPx}px</p>
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetShellThemeGeneralColors();
                  sync();
                }}
              >
                Back to default (general colours)
              </button>
            </Card>

            <Card
              title="Sidebar control"
              className="sm:col-span-2"
              hint="Shape the left rail: rounded pills, independent top/bottom notches with adjustable curve spread, insets, icon strokes, and stroke width. Use General colours for rail / active chip fills."
            >
              <SidebarThemeControlSection theme={theme} sync={sync} />
            </Card>

            <Card
              title="Chrome interactions"
              className="sm:col-span-2"
              hint="Sidebar hover tint, the moving route description panel, editor control bar (Execute / Clear / …), and Attach hover."
            >
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Sidebar hover", "sidebarNavHoverBg", theme.sidebarNavHoverBg],
                    ["Tooltip from", "shellHoverPanelFrom", theme.shellHoverPanelFrom],
                    ["Tooltip to", "shellHoverPanelTo", theme.shellHoverPanelTo],
                    ["Editor bar from", "editorControlBarButtonFrom", theme.editorControlBarButtonFrom],
                    ["Editor bar to", "editorControlBarButtonTo", theme.editorControlBarButtonTo],
                    ["Editor bar border", "editorControlBarBorder", theme.editorControlBarBorder],
                    ["Editor bar text", "editorControlBarText", theme.editorControlBarText],
                    ["Editor hover from", "editorControlBarHoverFrom", theme.editorControlBarHoverFrom],
                    ["Editor hover to", "editorControlBarHoverTo", theme.editorControlBarHoverTo],
                    ["Attach hover from", "attachButtonHoverFrom", theme.attachButtonHoverFrom],
                    ["Attach hover to", "attachButtonHoverTo", theme.attachButtonHoverTo],
                  ] as const
                ).map(([label, key, val]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className=" text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        writeShellTheme({ [key]: e.target.value } as Partial<ShellThemeState>);
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <div className="mb-1.5 flex flex-wrap gap-2">
                <div
                  className="h-6 w-24 rounded-sm border border-[#464646]"
                  style={{
                    background: `linear-gradient(to bottom, ${theme.shellHoverPanelFrom}, ${theme.shellHoverPanelTo})`,
                  }}
                  title="Tooltip preview"
                />
                <div
                  className="flex h-8 w-[120px] items-center justify-center border text-[11px]"
                  style={{
                    borderColor: theme.editorControlBarBorder,
                    color: theme.editorControlBarText,
                    background: `linear-gradient(to bottom, ${theme.editorControlBarButtonFrom}, ${theme.editorControlBarButtonTo})`,
                  }}
                >
                  Bar
                </div>
                <div
                  className="flex h-8 w-[120px] items-center justify-center border text-[11px]"
                  style={{
                    borderColor: theme.editorControlBarBorder,
                    color: theme.editorControlBarText,
                    background: `linear-gradient(to bottom, ${theme.attachButtonHoverFrom}, ${theme.attachButtonHoverTo})`,
                  }}
                >
                  Attach hover
                </div>
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetShellThemeChromeControls();
                  sync();
                }}
              >
                Back to default (chrome controls)
              </button>
            </Card>

            <Card
              title="Script editor — Monaco themes"
              className="sm:col-span-2"
              hint="Syntax highlighting for the script pane, unique to each UI shell. Included in theme pack export/import."
            >
              <EditorShellThemeControls compact />
              <p className="my-3 text-[10px] text-[#8a8a8a]">Per-shell Monaco syntax theme (stored separately for Blue / OG / X):</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-[#b0b0b0]">Synapse Blue</p>
                  <Select
                    value={theme.editorMonacoThemeId}
                    onValueChange={(v) => {
                      writeShellEditorMonacoTheme("editorMonacoThemeId", v);
                      sync();
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-auto min-h-[38px] w-full rounded-sm border border-[#555] bg-[#3d3d3d] py-1.5 text-left text-[10px] leading-snug text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(380px,50vh)] overflow-y-auto rounded-sm border border-[#5a5a5a] bg-[#3d3d3d] text-white">
                      {blueMonacoOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-[#b0b0b0]">Synapse 2017 (OG)</p>
                  <Select
                    value={theme.editorMonacoThemeIdSynapseOriginal}
                    onValueChange={(v) => {
                      writeShellEditorMonacoTheme("editorMonacoThemeIdSynapseOriginal", v);
                      sync();
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-auto min-h-[38px] w-full rounded-sm border border-[#555] bg-[#3d3d3d] py-1.5 text-left text-[10px] leading-snug text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(380px,50vh)] overflow-y-auto rounded-sm border border-[#5a5a5a] bg-[#3d3d3d] text-white">
                      {ogMonacoOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-[#b0b0b0]">Synapse X</p>
                  <Select
                    value={theme.editorMonacoThemeIdSynapseX}
                    onValueChange={(v) => {
                      writeShellEditorMonacoTheme("editorMonacoThemeIdSynapseX", v);
                      sync();
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-auto min-h-[38px] w-full rounded-sm border border-[#555] bg-[#3d3d3d] py-1.5 text-left text-[10px] leading-snug text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(420px,55vh)] overflow-y-auto rounded-sm border border-[#5a5a5a] bg-[#3d3d3d] text-white">
                      {sxMonacoOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card
              title="Script editor — bar & title text"
              className="sm:col-span-2"
              hint="Page title above tabs and bottom bar buttons (Execute, Clear, …, Attach). Resets with “Back to default (chrome controls)”."
            >
              <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
                {(
                  [
                    ["Page title (above tabs)", "editorPageTitle", 40],
                    ["Execute", "editorButtonExecute", 28],
                    ["Clear", "editorButtonClear", 28],
                    ["Open File", "editorButtonOpenFile", 28],
                    ["Execute File", "editorButtonExecuteFile", 28],
                    ["Save File", "editorButtonSaveFile", 28],
                    ["Attach", "editorButtonAttach", 28],
                  ] as const
                ).map(([label, key, maxLen]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="text"
                      maxLength={maxLen}
                      value={theme.editorChromeLabels[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          editorChromeLabels: { ...cur.editorChromeLabels, [key]: e.target.value },
                        });
                        sync();
                      }}
                      className={themesTextFieldClass}
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card
              title="Sidebar hover descriptions"
              className="sm:col-span-2"
              hint="Moving panel when you point at a sidebar icon. Two lines per route; leave a line blank to hide it."
            >
              <div className="flex flex-col gap-3">
                {SHELL_HOVER_ROUTE_PATHS.map((path) => {
                  const tip = theme.shellHoverTooltips[path];
                  return (
                    <div
                      key={path}
                      className="rounded-sm border border-[#464646] bg-[#2a2a2a] p-2"
                    >
                      <p className="mb-1.5 text-[10px] font-semibold text-white">
                        {HOVER_PANEL_ROUTE_LABELS[path]}{" "}
                        <span className="font-normal text-[#909090]">({path})</span>
                      </p>
                      <label className="mb-1.5 flex flex-col gap-1">
                        <span className="text-[9px] text-[#b0b0b0]">Title</span>
                        <input
                          type="text"
                          maxLength={44}
                          value={tip.title}
                          onChange={(e) => {
                            const cur = readShellTheme();
                            writeShellTheme({
                              shellHoverTooltips: {
                                ...cur.shellHoverTooltips,
                                [path]: { ...tip, title: e.target.value },
                              },
                            });
                            sync();
                          }}
                          className={themesTextFieldClass}
                        />
                      </label>
                      <label className="mb-1.5 flex flex-col gap-1">
                        <span className="text-[9px] text-[#b0b0b0]">Description line 1</span>
                        <input
                          type="text"
                          maxLength={96}
                          value={tip.descriptionLine1}
                          onChange={(e) => {
                            const cur = readShellTheme();
                            writeShellTheme({
                              shellHoverTooltips: {
                                ...cur.shellHoverTooltips,
                                [path]: { ...tip, descriptionLine1: e.target.value },
                              },
                            });
                            sync();
                          }}
                          className={themesTextFieldClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[9px] text-[#b0b0b0]">Description line 2</span>
                        <input
                          type="text"
                          maxLength={96}
                          value={tip.descriptionLine2}
                          onChange={(e) => {
                            const cur = readShellTheme();
                            writeShellTheme({
                              shellHoverTooltips: {
                                ...cur.shellHoverTooltips,
                                [path]: { ...tip, descriptionLine2: e.target.value },
                              },
                            });
                            sync();
                          }}
                          className={themesTextFieldClass}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="Attach progress overlay"
              className="sm:col-span-2"
              hint="Notch, horizontal bar, dots, and sliding step card during attach — matches the bar above the editor while Synapse connects."
            >
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Bar duration {Math.round(attach.barDurationMs / 100) / 10}s
              </p>
              <Slider
                className={cn("mb-2 max-w-md", sliderClass)}
                value={[attach.barDurationMs]}
                min={2500}
                max={15000}
                step={100}
                onValueChange={(v) => {
                  writeShellTheme({ attachOverlayTheme: { barDurationMs: v[0] ?? 3000 } });
                  sync();
                }}
              />
              <p className="mb-1 text-[10px] text-[#909090]">Notch and track</p>
              <div className="mb-2 flex flex-wrap gap-3">
                {(
                  [
                    ["Notch from", "notchFrom", attach.notchFrom],
                    ["Notch to", "notchTo", attach.notchTo],
                    ["Bar fill", "barFill", attach.barFill],
                    ["Track", "trackFill", attach.trackFill],
                  ] as const
                ).map(([label, key, val]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        writeShellTheme({
                          attachOverlayTheme: { [key]: e.target.value },
                        } as Partial<ShellThemeState>);
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Track opacity {Math.round(attach.trackOpacity * 100)}%
              </p>
              <Slider
                className={cn("mb-2 max-w-md", sliderClass)}
                value={[Math.round(attach.trackOpacity * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  writeShellTheme({
                    attachOverlayTheme: { trackOpacity: (v[0] ?? 68) / 100 },
                  });
                  sync();
                }}
              />
              <p className="mb-1 text-[10px] text-[#909090]">Dots</p>
              <div className="mb-2 flex flex-wrap gap-3">
                {(
                  [
                    ["Dot stroke", "dotStroke", attach.dotStroke],
                    ["Inactive", "dotInactive", attach.dotInactive],
                    ["Active", "dotActive", attach.dotActive],
                    ["Complete", "dotComplete", attach.dotComplete],
                  ] as const
                ).map(([label, key, val]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        writeShellTheme({
                          attachOverlayTheme: { [key]: e.target.value },
                        } as Partial<ShellThemeState>);
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <p className="mb-1 text-[10px] text-[#909090]">Step card</p>
              <div className="mb-2 flex flex-wrap gap-3">
                {(
                  [
                    ["Card from", "stepCardFrom", attach.stepCardFrom],
                    ["Card to", "stepCardTo", attach.stepCardTo],
                    ["Title", "stepTitleColor", attach.stepTitleColor],
                    ["Body", "stepBodyColor", attach.stepBodyColor],
                  ] as const
                ).map(([label, key, val]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => {
                        writeShellTheme({
                          attachOverlayTheme: { [key]: e.target.value },
                        } as Partial<ShellThemeState>);
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
              <p className="mb-1 text-[10px] text-[#909090]">Step copy (three cards)</p>
              <div className="mb-2 grid max-w-2xl gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex min-w-0 flex-col gap-1 rounded-sm border border-[#464646] bg-[#2a2a2a] p-1.5">
                    <span className="text-[9px] text-[#b0b0b0]">Step {idx + 1}</span>
                    <input
                      type="text"
                      maxLength={40}
                      value={attach.steps[idx].title}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        const nextSteps = [...cur.attachOverlayTheme.steps] as ShellThemeState["attachOverlayTheme"]["steps"];
                        nextSteps[idx] = { ...nextSteps[idx], title: e.target.value };
                        writeShellTheme({ attachOverlayTheme: { steps: nextSteps } });
                        sync();
                      }}
                      className={themesTextFieldClass}
                    />
                    <input
                      type="text"
                      maxLength={120}
                      value={attach.steps[idx].description}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        const nextSteps = [...cur.attachOverlayTheme.steps] as ShellThemeState["attachOverlayTheme"]["steps"];
                        nextSteps[idx] = { ...nextSteps[idx], description: e.target.value };
                        writeShellTheme({ attachOverlayTheme: { steps: nextSteps } });
                        sync();
                      }}
                      className={themesTextFieldClass}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetAttachOverlayTheme();
                  sync();
                }}
              >
                Back to default (attach overlay)
              </button>
              <div className="mt-2 border-t border-[#464646] pt-2">
                <AttachOverlayThemePreview />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="init"
          className="synapse-scroll mt-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 focus-visible:outline-none"
        >
          <div className="mb-1.5 flex items-center justify-center gap-1">
            <span className="text-[10px] text-[color:var(--tp-page-subtitle)]">Customize for</span>
            <div className="flex gap-1 rounded-sm border border-[color:var(--tp-tabs-list-border)] bg-[color:var(--tp-tabs-list-bg)] p-0.5">
              {(
                [
                  ["default", "Synapse Blue"],
                  ["synapseOriginal", "Synapse 2017 (OG)"],
                  ["synapseX", "Synapse X"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLoadingUi(id)}
                  className={`px-2 py-0.5 text-[10px] leading-tight transition-colors ${
                    loadingUi === id
                      ? "bg-[color:var(--tp-tab-active-bg)] text-[color:var(--tp-tab-active-text)]"
                      : "text-[color:var(--tp-tab-inactive-text)] hover:bg-[color:var(--tp-tab-hover-bg)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pb-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="order-2 flex min-w-0 flex-col gap-1.5 lg:order-1">
              <Card
                title="Loading screen background"
                hint="Shown behind the init layout. Logo matches Shell & chrome until you change it there. Opacity applies to image or video only."
              >
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  <div className="min-w-0 flex-1 truncate border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] px-2 py-1  text-[10px] text-white">
                    {initBgLabel}
                  </div>
                  <button type="button" className={browseBtn} onClick={() => initImgRef.current?.click()}>
                    Image…
                  </button>
                  <button type="button" className={browseBtn} onClick={() => initVidRef.current?.click()}>
                    Video…
                  </button>
                </div>
                <div className="mb-1.5 grid max-w-lg gap-1.5 sm:grid-cols-2">
                  <div>
                    <p className="mb-1  text-[10px] text-[#b0b0b0]">
                      Pos X {init.backgroundPosition.x}%
                    </p>
                    <Slider
                      className={sliderClass}
                      value={[init.backgroundPosition.x]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => {
                        const cur = readShellTheme();
                        const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                        const sub = cur[key] as InitScreenThemeState;
                        writeShellTheme({
                          [key]: {
                            ...sub,
                            backgroundPosition: { ...sub.backgroundPosition, x: v[0] ?? 50 },
                          },
                        });
                        sync();
                      }}
                    />
                  </div>
                  <div>
                    <p className="mb-1  text-[10px] text-[#b0b0b0]">
                      Pos Y {init.backgroundPosition.y}%
                    </p>
                    <Slider
                      className={sliderClass}
                      value={[init.backgroundPosition.y]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => {
                        const cur = readShellTheme();
                        const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                        const sub = cur[key] as InitScreenThemeState;
                        writeShellTheme({
                          [key]: {
                            ...sub,
                            backgroundPosition: { ...sub.backgroundPosition, y: v[0] ?? 50 },
                          },
                        });
                        sync();
                      }}
                    />
                  </div>
                </div>
                <p className="mb-1 mt-2  text-[10px] text-[#b0b0b0]">
                  Background opacity {Math.round(init.backgroundOpacity * 100)}%
                </p>
                <Slider
                  className={cn("mb-1.5 max-w-lg", sliderClass)}
                  value={[Math.round(init.backgroundOpacity * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    const cur = readShellTheme();
                    const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                    const sub = cur[key] as InitScreenThemeState;
                    writeShellTheme({
                      [key]: { ...sub, backgroundOpacity: (v[0] ?? 100) / 100 },
                    });
                    sync();
                  }}
                />
                <button
                  type="button"
                  className={linkBtn}
                  onClick={async () => {
                    if (loadingUi === "default") await resetInitTheme();
                    else {
                      const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : "initThemeSynapseX";
                      writeShellTheme({ [key]: { ...DEFAULT_SHELL_THEME.initTheme } });
                    }
                    sync();
                  }}
                >
                  Back to default (loading background)
                </button>
              </Card>

              <Card
                title="Loading screen colours"
                hint="Surfaces, progress column, step dots, and typography — mirrors the level of control you have on the main shell."
                className="sm:col-span-2"
              >
                <p className="mb-1.5 text-[10px] text-[#909090]">
                  Surfaces and panels
                </p>
                <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {(
                    [
                      ["Shell", "shellBg", init.shellBg],
                      ["Header from", "headerFrom", init.headerFrom],
                      ["Header to", "headerTo", init.headerTo],
                      ["Progress bar", "progressBar", init.progressBar],
                      ["Progress track", "progressTrackBackground", init.progressTrackBackground],
                      ["Step panel from", "stepPanelFrom", init.stepPanelFrom],
                      ["Step panel to", "stepPanelTo", init.stepPanelTo],
                    ] as const
                  ).map(([label, key, val]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className=" text-[9px] text-[#b0b0b0]">{label}</span>
                      <input
                        type="color"
                        value={val}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const shellKey = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[shellKey] as InitScreenThemeState;
                          writeShellTheme({
                            [shellKey]: { ...sub, [key]: e.target.value },
                          });
                          sync();
                        }}
                        className="h-8 w-full max-w-[72px] cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                      />
                    </label>
                  ))}
                </div>
                <p className="mb-1.5 text-[10px] text-[#909090]">
                  Step row circles
                </p>
                <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["Dot idle", "stepDotInactive", init.stepDotInactive],
                      ["Dot active", "stepDotActive", init.stepDotActive],
                      ["Dot ring", "stepDotStroke", init.stepDotStroke],
                    ] as const
                  ).map(([label, key, val]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className=" text-[9px] text-[#b0b0b0]">{label}</span>
                      <input
                        type="color"
                        value={val}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const shellKey = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[shellKey] as InitScreenThemeState;
                          writeShellTheme({
                            [shellKey]: { ...sub, [key]: e.target.value },
                          });
                          sync();
                        }}
                        className="h-8 w-full max-w-[72px] cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                      />
                    </label>
                  ))}
                </div>
                <p className="mb-1.5 text-[10px] text-[#909090]">
                  Text
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["Primary (titles)", "textPrimary", init.textPrimary],
                      ["Secondary (body)", "textSecondary", init.textSecondary],
                    ] as const
                  ).map(([label, key, val]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className=" text-[9px] text-[#b0b0b0]">{label}</span>
                      <input
                        type="color"
                        value={val}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const shellKey = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[shellKey] as InitScreenThemeState;
                          writeShellTheme({
                            [shellKey]: { ...sub, [key]: e.target.value },
                          });
                          sync();
                        }}
                        className="h-8 w-full max-w-[72px] cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <Card
                title="Initialization step copy"
                className="sm:col-span-2"
                hint="Three steps in the loading animation. Resets with “Back to default (loading background)”."
              >
                <div className="grid max-w-2xl gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="flex min-w-0 flex-col gap-1 rounded-sm border border-[#464646] bg-[#2a2a2a] p-1.5"
                    >
                      <span className="text-[9px] text-[#b0b0b0]">Step {idx + 1}</span>
                      <input
                        type="text"
                        maxLength={56}
                        value={init.loadingSteps[idx].title}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[key] as InitScreenThemeState;
                          const nextSteps = [...sub.loadingSteps] as InitScreenThemeState["loadingSteps"];
                          nextSteps[idx] = { ...nextSteps[idx], title: e.target.value };
                          writeShellTheme({ [key]: { ...sub, loadingSteps: nextSteps } });
                          sync();
                        }}
                        className={themesTextFieldClass}
                      />
                      <input
                        type="text"
                        maxLength={120}
                        value={init.loadingSteps[idx].descriptionLine1}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[key] as InitScreenThemeState;
                          const nextSteps = [...sub.loadingSteps] as InitScreenThemeState["loadingSteps"];
                          nextSteps[idx] = { ...nextSteps[idx], descriptionLine1: e.target.value };
                          writeShellTheme({ [key]: { ...sub, loadingSteps: nextSteps } });
                          sync();
                        }}
                        className={themesTextFieldClass}
                        placeholder="Line 1"
                      />
                      <input
                        type="text"
                        maxLength={120}
                        value={init.loadingSteps[idx].descriptionLine2}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          const key = loadingUi === "synapseOriginal" ? "initThemeSynapseOriginal" : loadingUi === "synapseX" ? "initThemeSynapseX" : "initTheme";
                          const sub = cur[key] as InitScreenThemeState;
                          const nextSteps = [...sub.loadingSteps] as InitScreenThemeState["loadingSteps"];
                          nextSteps[idx] = { ...nextSteps[idx], descriptionLine2: e.target.value };
                          writeShellTheme({ [key]: { ...sub, loadingSteps: nextSteps } });
                          sync();
                        }}
                        className={themesTextFieldClass}
                        placeholder="Line 2"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="order-1 flex w-full min-w-0 shrink-0 justify-center lg:order-2 lg:sticky lg:top-0 lg:z-10 lg:w-auto lg:justify-end lg:self-start">
              <InitScreenThemePreview theme={init} />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="confirmation"
          className="synapse-scroll mt-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 focus-visible:outline-none"
        >
          <div className="grid grid-cols-1 gap-1.5 pb-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="order-2 flex min-w-0 flex-col gap-1.5 lg:order-1">
              <Card
                title="Confirmation dialog background"
                hint="Optional image behind Clear / close-all prompts (separate Tauri windows). Logo uses the default Synapse mark."
              >
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  <div className="min-w-0 flex-1 truncate border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] px-2 py-1 text-[10px] text-white">
                    {confBgLabel}
                  </div>
                  <button
                    type="button"
                    className={browseBtn}
                    onClick={() => confirmImgRef.current?.click()}
                  >
                    Image…
                  </button>
                  <button
                    type="button"
                    className={browseBtn}
                    onClick={() => {
                      writeShellTheme({
                        confirmationTheme: {
                          ...readShellTheme().confirmationTheme,
                          backgroundMode: "none",
                          backgroundImageDataUrl: null,
                          backgroundImageFilename: null,
                          hasStoredBackgroundImage: false,
                        },
                      });
                      sync();
                    }}
                  >
                    None
                  </button>
                </div>
                <p className="mb-1 mt-2 text-[10px] text-[#b0b0b0]">
                  Opacity {Math.round(conf.backgroundOpacity * 100)}%
                </p>
                <Slider
                  className={cn("mb-1.5 max-w-lg", sliderClass)}
                  value={[Math.round(conf.backgroundOpacity * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        backgroundOpacity: (v[0] ?? 100) / 100,
                      },
                    });
                    sync();
                  }}
                />
                {conf.backgroundMode === "image" ? (
                  <div className="mb-1.5 grid max-w-lg gap-1.5 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] text-[#b0b0b0]">
                        Pos X {conf.backgroundPosition.x}%
                      </p>
                      <Slider
                        className={sliderClass}
                        value={[conf.backgroundPosition.x]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => {
                          const cur = readShellTheme();
                          writeShellTheme({
                            confirmationTheme: {
                              ...cur.confirmationTheme,
                              backgroundPosition: {
                                ...cur.confirmationTheme.backgroundPosition,
                                x: v[0] ?? 50,
                              },
                            },
                          });
                          sync();
                        }}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-[#b0b0b0]">
                        Pos Y {conf.backgroundPosition.y}%
                      </p>
                      <Slider
                        className={sliderClass}
                        value={[conf.backgroundPosition.y]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => {
                          const cur = readShellTheme();
                          writeShellTheme({
                            confirmationTheme: {
                              ...cur.confirmationTheme,
                              backgroundPosition: {
                                ...cur.confirmationTheme.backgroundPosition,
                                y: v[0] ?? 50,
                              },
                            },
                          });
                          sync();
                        }}
                      />
                    </div>
                  </div>
                ) : null}
                <p className="mb-1 mt-2 text-[10px] text-[#b0b0b0]">
                  Dialog window width {conf.windowWidthPx}px (Tauri)
                </p>
                <Slider
                  className={cn("mb-1.5 max-w-lg", sliderClass)}
                  value={[conf.windowWidthPx]}
                  min={420}
                  max={720}
                  step={1}
                  onValueChange={(v) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        windowWidthPx: v[0] ?? 540,
                      },
                    });
                    sync();
                  }}
                />
                <p className="mb-1 text-[10px] text-[#b0b0b0]">
                  Dialog window height {conf.windowHeightPx}px (Tauri)
                </p>
                <Slider
                  className={cn("mb-1.5 max-w-lg", sliderClass)}
                  value={[conf.windowHeightPx]}
                  min={220}
                  max={420}
                  step={1}
                  onValueChange={(v) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        windowHeightPx: v[0] ?? 264,
                      },
                    });
                    sync();
                  }}
                />
                <button
                  type="button"
                  className={linkBtn}
                  onClick={async () => {
                    await resetConfirmationTheme();
                    sync();
                  }}
                >
                  Back to default (confirmation dialogs)
                </button>
              </Card>

              <Card title="Surfaces &amp; chrome" className="sm:col-span-2">
                <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {(
                    [
                      ["Panel", "panelBg"],
                      ["Top bar from", "topBarFrom"],
                      ["Top bar to", "topBarTo"],
                      ["Title", "titleColor"],
                      ["Body", "bodyColor"],
                      ["Icon", "iconStroke"],
                    ] as const
                  ).map(([label, key]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                      <input
                        type="color"
                        value={conf[key]}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          writeShellTheme({
                            confirmationTheme: { ...cur.confirmationTheme, [key]: e.target.value },
                          });
                          sync();
                        }}
                        className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <Card title="Buttons" className="sm:col-span-2">
                <div className="mb-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["No from", "noButtonFrom"],
                      ["No to", "noButtonTo"],
                      ["No border", "noButtonBorder"],
                      ["No text", "noButtonText"],
                      ["Yes from", "yesButtonFrom"],
                      ["Yes to", "yesButtonTo"],
                      ["Yes border", "yesButtonBorder"],
                      ["Yes text", "yesButtonText"],
                    ] as const
                  ).map(([label, key]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                      <input
                        type="color"
                        value={conf[key]}
                        onChange={(e) => {
                          const cur = readShellTheme();
                          writeShellTheme({
                            confirmationTheme: { ...cur.confirmationTheme, [key]: e.target.value },
                          });
                          sync();
                        }}
                        className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              <Card title="Copy — clear current tab" className="sm:col-span-2">
                <input
                  type="text"
                  value={conf.clearCurrentTitle}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: { ...cur.confirmationTheme, clearCurrentTitle: e.target.value },
                    });
                    sync();
                  }}
                  className={themesTextFieldClass}
                  placeholder="Title"
                />
                <input
                  type="text"
                  value={conf.clearCurrentBodyLine1}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        clearCurrentBodyLine1: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 1"
                />
                <input
                  type="text"
                  value={conf.clearCurrentBodyLine2}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        clearCurrentBodyLine2: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 2"
                />
              </Card>

              <Card title="Copy — close all tabs" className="sm:col-span-2">
                <input
                  type="text"
                  value={conf.closeAllTitle}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: { ...cur.confirmationTheme, closeAllTitle: e.target.value },
                    });
                    sync();
                  }}
                  className={themesTextFieldClass}
                  placeholder="Title"
                />
                <input
                  type="text"
                  value={conf.closeAllBodyLine1}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        closeAllBodyLine1: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 1"
                />
                <input
                  type="text"
                  value={conf.closeAllBodyLine2}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        closeAllBodyLine2: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 2"
                />
              </Card>

              <Card title="Copy — close script tab" className="sm:col-span-2">
                <input
                  type="text"
                  value={conf.closeTabTitle}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: { ...cur.confirmationTheme, closeTabTitle: e.target.value },
                    });
                    sync();
                  }}
                  className={themesTextFieldClass}
                  placeholder="Title"
                />
                <input
                  type="text"
                  value={conf.closeTabBodyLine1}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        closeTabBodyLine1: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 1"
                />
                <input
                  type="text"
                  value={conf.closeTabBodyLine2}
                  onChange={(e) => {
                    const cur = readShellTheme();
                    writeShellTheme({
                      confirmationTheme: {
                        ...cur.confirmationTheme,
                        closeTabBodyLine2: e.target.value,
                      },
                    });
                    sync();
                  }}
                  className={cn(themesTextFieldClass, "mt-1")}
                  placeholder="Line 2"
                />
              </Card>
            </div>

            <div className="order-1 flex w-full min-w-0 shrink-0 flex-col items-center gap-3 lg:order-2 lg:sticky lg:top-0 lg:z-10 lg:w-auto lg:self-start">
              <p className="text-center text-[9px] text-[#888]">Clear current tab</p>
              <ConfirmationDialogThemePreview theme={conf} mode="current" />
              <p className="text-center text-[9px] text-[#888]">Close all tabs</p>
              <ConfirmationDialogThemePreview theme={conf} mode="all" />
              <p className="text-center text-[9px] text-[#888]">Close script tab</p>
              <ConfirmationDialogThemePreview theme={conf} mode="tab" />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="scriptHub"
          className="synapse-scroll mt-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 focus-visible:outline-none"
        >
          <div className="grid grid-cols-1 gap-1.5 pb-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="order-2 flex min-w-0 flex-col gap-1.5 lg:order-1">
            <Card
              title="Card corners"
              hint="Border radius for Script Hub and ScriptBlox script cards (0–24px)."
              className="sm:col-span-2"
            >
              <p className="mb-1 text-[10px] text-[#b0b0b0]">
                Radius {theme.scriptHubTheme.cardRadiusPx}px
              </p>
              <Slider
                className={cn("mb-2 max-w-md", sliderClass)}
                value={[theme.scriptHubTheme.cardRadiusPx]}
                min={0}
                max={SCRIPT_HUB_THEME_CARD_RADIUS_MAX}
                step={1}
                onValueChange={(v) => {
                  const cur = readShellTheme();
                  writeShellTheme({
                    scriptHubTheme: { ...cur.scriptHubTheme, cardRadiusPx: v[0] ?? 0 },
                  });
                  sync();
                }}
              />
            </Card>

            <Card title="Cards & thumbnails" className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Card border", "cardBorderColor"],
                    ["Card background", "cardBackground"],
                    ["Image fallback", "thumbFallbackBg"],
                    ["Title text", "titleColor"],
                    ["Subtitle / game", "subtitleColor"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={theme.scriptHubTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          scriptHubTheme: { ...cur.scriptHubTheme, [key]: e.target.value },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card title="ScriptBlox search" className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Field background", "searchBackground"],
                    ["Border", "searchBorder"],
                    ["Focus border", "searchFocusBorder"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={theme.scriptHubTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          scriptHubTheme: { ...cur.scriptHubTheme, [key]: e.target.value },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card title="Primary button (Get script / Open in editor)" className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Background", "ctaBackground"],
                    ["Hover", "ctaHoverBackground"],
                    ["Border", "ctaBorder"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={theme.scriptHubTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          scriptHubTheme: { ...cur.scriptHubTheme, [key]: e.target.value },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card title="Secondary buttons (Back, pagination, ScriptBlox Page)" className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap gap-3">
                {(
                  [
                    ["Gradient from", "secondaryFrom"],
                    ["Gradient to", "secondaryTo"],
                    ["Border", "secondaryBorder"],
                    ["Text", "secondaryText"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                    <input
                      type="color"
                      value={theme.scriptHubTheme[key]}
                      onChange={(e) => {
                        const cur = readShellTheme();
                        writeShellTheme({
                          scriptHubTheme: { ...cur.scriptHubTheme, [key]: e.target.value },
                        });
                        sync();
                      }}
                      className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[color:var(--tp-color-well-border)] bg-[color:var(--tp-color-well-bg)] p-0"
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card title="Reset" className="sm:col-span-2">
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  resetScriptHubTheme();
                  sync();
                }}
              >
                Back to default (Script Hub)
              </button>
            </Card>
            </div>

            <div className="order-1 flex w-full min-w-0 shrink-0 justify-center lg:order-2 lg:sticky lg:top-0 lg:z-10 lg:w-auto lg:justify-end lg:self-start">
              <div className="flex w-full max-w-[320px] flex-col gap-1 lg:max-w-none">
                <p className="m-0 text-[9px] text-[#b0b0b0]">Live preview</p>
                <ScriptHubThemePreview
                  scriptHubTheme={theme.scriptHubTheme}
                  pageAreaBg={theme.pageAreaBg}
                  editorNavButtonStyle={getEditorChromeNavButtonStyle(theme)}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
