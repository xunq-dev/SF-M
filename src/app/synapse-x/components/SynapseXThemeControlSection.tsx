import { useEffect, useRef, useState } from "react";
import {
  exportSynapseXTheme,
  importSynapseXTheme,
  resetSynapseXTheme,
  DEFAULT_SYNAPSE_X_THEME,
  useSynapseXTheme,
  writeSynapseXTheme,
} from "@/app/synapse-x/synapseXTheme";
import { TOP_BAR_LOGO_PRESETS } from "@/ui/topBarLogos";
import EditorShellThemeControls from "@/app/components/EditorShellThemeControls";
import EditorMonacoThemeDropdown from "@/app/components/EditorMonacoThemeDropdown";
import { LiveEditToggleButton } from "@/app/liveEdit/LiveEditToggleButton";
import { TextLogoThemeFields } from "@/app/components/TextLogoThemeFields";
import {
  readSynapseXThemeUiLiveEdit,
  writeSynapseXThemeUiLiveEdit,
  SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT,
} from "@/app/synapse-x/synapseXThemeUi";
import { isEnhancedScriptListEnabled } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";
import { ScriptListThemeFields } from "@/app/editor/script-list/ScriptListThemeFields";

const MAX_IMAGE_BYTES = 1_500_000;
const PANEL_BG = "var(--sx-panel-bg, #3C3C3C)";

function ColorRow(props: {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}): JSX.Element {
  return (
    <div
      className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid border-[#2a2a2a] px-3"
      style={{ backgroundColor: PANEL_BG }}
    >
      <div className="relative h-[33px] w-[120px] shrink-0">
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
          <span
            className="mx-2 inline-block h-[18px] w-[18px] shrink-0 border border-solid border-black/40"
            style={{ backgroundColor: props.value }}
            aria-hidden
          />
          <span className="text-center font-sans text-[12px] leading-none text-white">
            {props.value.toUpperCase()}
          </span>
        </div>
        <input
          type="color"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          aria-label={props.label}
          className="absolute inset-0 z-[3] h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pl-3">
        <span className="font-sans text-[13px] leading-tight text-white">{props.label}</span>
        <span className="font-sans text-[11px] leading-snug text-[#a3a3a3]">{props.description}</span>
      </div>
    </div>
  );
}

async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file (PNG / JPG / GIF / WEBP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large (${Math.round(file.size / 1024)} KB > ${Math.round(MAX_IMAGE_BYTES / 1024)} KB).`);
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") resolve(r);
      else reject(new Error("Unexpected reader result."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsDataURL(file);
  });
}

/** Helper to fetch an asset URL and turn it into a Data URL for the theme blob. */
async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function SynapseXThemeControlSection() {
  const theme = useSynapseXTheme();
  const { settings: appSettings } = useAppSettings();
  const [appearanceErr, setAppearanceErr] = useState<string | null>(null);
  const [liveEditEnabled, setLiveEditEnabled] = useState(readSynapseXThemeUiLiveEdit);

  useEffect(() => {
    const sync = () => setLiveEditEnabled(readSynapseXThemeUiLiveEdit());
    window.addEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  const overlayFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleOverlayPick = async (file: File) => {
    setAppearanceErr(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      writeSynapseXTheme({ overlayDataUrl: dataUrl });
    } catch (e) {
      setAppearanceErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleLogoPick = async (file: File) => {
    setAppearanceErr(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      writeSynapseXTheme({ logoDataUrl: dataUrl });
    } catch (e) {
      setAppearanceErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleImport = async (file: File) => {
    setAppearanceErr(null);
    const res = await importSynapseXTheme(file);
    if (!res.ok) setAppearanceErr(res.error);
  };

  const handleExport = async () => {
    setAppearanceErr(null);
    const res = await exportSynapseXTheme();
    if (!res.ok) setAppearanceErr(res.error);
  };



  return (
    <div className="flex flex-col gap-2 pb-4">
      {appearanceErr ? (
        <div className="shrink-0 border border-solid border-[#860000] bg-[#4a0000]/50 p-2 text-center font-sans text-[12px] text-[#ff7676]">
          {appearanceErr}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-black/30 pb-2 pt-1">
        <div className="min-w-0">
          <span className="font-sans text-[13px] text-white">Live edit</span>
          <span className="ml-2 font-sans text-[11px] text-[#a3a3a3]">
            Right-click surfaces in the main window to recolor.
          </span>
        </div>
        <LiveEditToggleButton
          compact
          enabled={liveEditEnabled}
          onChange={(on) => {
            setLiveEditEnabled(on);
            writeSynapseXThemeUiLiveEdit(on);
          }}
        />
      </div>

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Core Colors
      </div>
      <ColorRow label="Window background" description="Outer fill behind buttons and the editor." value={theme.windowBg} onChange={(hex) => writeSynapseXTheme({ windowBg: hex })} />
      <ColorRow label="Panel background" description="Title bar, side panel, and button surfaces." value={theme.panelBg} onChange={(hex) => writeSynapseXTheme({ panelBg: hex })} />
      <ColorRow label="Text" description="Title-bar titles, banner, and headers." value={theme.text} onChange={(hex) => writeSynapseXTheme({ text: hex })} />

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Buttons
      </div>
      <ColorRow label="Button Background" description="Normal state for buttons." value={theme.buttonBg} onChange={(hex) => writeSynapseXTheme({ buttonBg: hex })} />
      <ColorRow label="Button Hover" description="Hover state for buttons." value={theme.buttonHoverBg} onChange={(hex) => writeSynapseXTheme({ buttonHoverBg: hex })} />
      <ColorRow label="Button Active" description="Pressed state for buttons." value={theme.buttonActiveBg} onChange={(hex) => writeSynapseXTheme({ buttonActiveBg: hex })} />
      <ColorRow label="Button Border" description="Border around buttons." value={theme.buttonBorder} onChange={(hex) => writeSynapseXTheme({ buttonBorder: hex })} />
      <ColorRow label="Button Text" description="Text color for buttons." value={theme.buttonText} onChange={(hex) => writeSynapseXTheme({ buttonText: hex })} />

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Editor & Tabs
      </div>
      <div className="shrink-0 border-b border-[#2a2a2a] pb-1 pt-2 font-sans text-[14px] text-white">
        Editor themes
      </div>
      <div className="mb-3 space-y-3">
        <EditorMonacoThemeDropdown field="editorMonacoThemeIdSynapseX" />
        <EditorShellThemeControls
          compact
          onWrapperBgChange={(hex) => writeSynapseXTheme({ editorBg: hex })}
        />
      </div>
      <ColorRow label="Tab Background" description="Normal state for editor tabs." value={theme.tabBg} onChange={(hex) => writeSynapseXTheme({ tabBg: hex })} />
      <ColorRow label="Tab Active" description="Active state for the selected editor tab." value={theme.tabActiveBg} onChange={(hex) => writeSynapseXTheme({ tabActiveBg: hex })} />
      <ColorRow label="Tab Border" description="Normal state border for editor tabs." value={theme.tabBorder} onChange={(hex) => writeSynapseXTheme({ tabBorder: hex })} />
      <ColorRow label="Tab Active Border" description="Active state border for the selected editor tab." value={theme.tabActiveBorder} onChange={(hex) => writeSynapseXTheme({ tabActiveBorder: hex })} />
      <ColorRow label="Tab Text" description="Text color for editor tabs." value={theme.tabText} onChange={(hex) => writeSynapseXTheme({ tabText: hex })} />

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Lists & Icons
      </div>
      <ColorRow label="List Hover" description="Hover state for script list items." value={theme.listHoverBg} onChange={(hex) => writeSynapseXTheme({ listHoverBg: hex })} />
      <ColorRow label="List Text" description="Text color for script list items." value={theme.listText} onChange={(hex) => writeSynapseXTheme({ listText: hex })} />
      <ColorRow label="Icon Color" description="Color for close, add, and save icons." value={theme.iconColor} onChange={(hex) => writeSynapseXTheme({ iconColor: hex })} />

      {isEnhancedScriptListEnabled(appSettings, "synapseX") ? (
        <>
          <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
            Enhanced Script List
          </div>
          <ScriptListThemeFields
            tokens={theme.scriptList}
            onChange={(partial) => writeSynapseXTheme({ scriptList: partial })}
            ColorRow={ColorRow}
          />
        </>
      ) : null}

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Media
      </div>
      <div
        className="flex w-full shrink-0 flex-col gap-2 border border-solid border-[#2a2a2a] p-3"
        style={{ backgroundColor: PANEL_BG }}
      >
        <div className="flex flex-row items-center gap-3">
          <div className="relative h-[33px] w-[120px] shrink-0">
            <button
              type="button"
              className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
              onClick={() => overlayFileRef.current?.click()}
              aria-label="Choose overlay image"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
              <span className="text-center font-sans text-[12px] leading-none text-white">
                {theme.overlayDataUrl ? "Replace..." : "Choose image..."}
              </span>
            </div>
            <input
              ref={overlayFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleOverlayPick(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="min-w-0 flex-1 font-sans text-[12px] leading-snug text-[#a3a3a3]">
            Tints the Synapse X main window background.
          </p>
          {theme.overlayDataUrl ? (
            <button
              type="button"
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-sans text-[11px] text-[#a3a3a3] underline hover:text-white"
              onClick={() => writeSynapseXTheme({ overlayDataUrl: null })}
            >
              Remove
            </button>
          ) : null}
        </div>
        <div className="flex flex-row items-center gap-3">
          <span className="w-[64px] font-sans text-[11px] text-[#a3a3a3]">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(theme.overlayOpacity * 100)}
            onChange={(e) =>
              writeSynapseXTheme({ overlayOpacity: Number(e.target.value) / 100 })
            }
            className="flex-1 accent-[#3a3a3a]"
            aria-label="Overlay opacity"
          />
          <span className="w-[36px] text-right font-sans text-[11px] tabular-nums text-[#a3a3a3]">
            {Math.round(theme.overlayOpacity * 100)}%
          </span>
        </div>
        <div className="flex flex-row items-center gap-3">
          <span className="w-[64px] font-sans text-[11px] text-[#a3a3a3]">Mode</span>
          <select
            className="flex-1 h-[24px] border border-solid border-[#2a2a2a] bg-[#2d2d2d] px-1 font-sans text-[11px] text-white outline-none cursor-pointer"
            value={theme.overlayMode}
            onChange={(e) => writeSynapseXTheme({ overlayMode: e.target.value as "behind" | "top" })}
          >
            <option value="behind">Behind menus</option>
            <option value="top">Above UI (Max 70%)</option>
          </select>
        </div>
      </div>

      <div
        className="flex h-[auto] w-full shrink-0 flex-col gap-2 border border-solid border-[#2a2a2a] p-3"
        style={{ backgroundColor: PANEL_BG }}
      >
        <TextLogoThemeFields
          compact
          fallbackText={DEFAULT_SYNAPSE_X_THEME.logoText}
          mode={theme.logoMode}
          onModeChange={(logoMode) => writeSynapseXTheme({ logoMode })}
          text={theme.logoText}
          onTextChange={(logoText) => writeSynapseXTheme({ logoText })}
          color={theme.logoTextColor}
          onColorChange={(logoTextColor) => writeSynapseXTheme({ logoTextColor })}
          fontId={theme.logoTextFontId}
          onFontIdChange={(logoTextFontId) => writeSynapseXTheme({ logoTextFontId })}
          sizePx={theme.logoTextSizePx}
          onSizePxChange={(logoTextSizePx) => writeSynapseXTheme({ logoTextSizePx })}
          weight={theme.logoTextWeight}
          onWeightChange={(logoTextWeight) => writeSynapseXTheme({ logoTextWeight })}
          letterSpacing={theme.logoTextLetterSpacing}
          onLetterSpacingChange={(logoTextLetterSpacing) =>
            writeSynapseXTheme({ logoTextLetterSpacing })
          }
        />
        {theme.logoMode === "image" ? (
        <>
        <div className="flex flex-row items-center gap-3">
          <div className="relative h-[33px] w-[120px] shrink-0">
            <button
              type="button"
              className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
              onClick={() => logoFileRef.current?.click()}
              aria-label="Choose custom logo"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
              <span className="text-center font-sans text-[12px] leading-none text-white">
                {theme.logoDataUrl ? "Replace..." : "Custom logo..."}
              </span>
            </div>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleLogoPick(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="min-w-0 flex-1 font-sans text-[12px] leading-snug text-[#a3a3a3]">
            Replaces the logo on every Synapse X window.
          </p>
          {theme.logoDataUrl ? (
            <button
              type="button"
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-sans text-[11px] text-[#a3a3a3] underline hover:text-white"
              onClick={() => writeSynapseXTheme({ logoDataUrl: null })}
            >
              Remove
            </button>
          ) : null}
        </div>
        
        {/* Preset Logos */}
        <div className="mt-1 flex flex-row items-center gap-3">
          <span className="w-[64px] font-sans text-[11px] text-[#a3a3a3]">Preset</span>
          <select
            className="flex-1 h-[24px] border border-solid border-[#2a2a2a] bg-[#2d2d2d] px-1 font-sans text-[11px] text-white outline-none cursor-pointer"
            value={theme.logoPreset}
            onChange={(e) => writeSynapseXTheme({ logoPreset: e.target.value })}
          >
            {TOP_BAR_LOGO_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        </>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-black/30 pb-1 pt-2 font-sans text-[14px] text-white">
        Manage Theme
      </div>
      <div className="flex flex-row items-center gap-3">
        <div className="relative h-[33px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => importFileRef.current?.click()}
            aria-label="Import theme"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
            <span className="text-center font-sans text-[12px] leading-none text-white">
              Import
            </span>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = "";
            }}
          />
        </div>
        
        <div className="relative h-[33px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => void handleExport()}
            aria-label="Export theme"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
            <span className="text-center font-sans text-[12px] leading-none text-white">
              Export
            </span>
          </div>
        </div>

        <div className="relative h-[33px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => {
              setAppearanceErr(null);
              resetSynapseXTheme();
            }}
            aria-label="Reset theme to defaults"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#521c1c] bg-[#361515]">
            <span className="text-center font-sans text-[12px] leading-none text-white">
              Reset
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
