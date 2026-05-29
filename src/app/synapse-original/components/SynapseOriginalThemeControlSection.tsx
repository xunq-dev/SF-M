import { useRef, useState, useEffect } from "react";
import {
  exportOgTheme,
  importOgTheme,
  resetOgTheme,
  DEFAULT_OG_THEME,
  useOgTheme,
  writeOgTheme,
} from "@/app/synapse-original/ogTheme";
import { TOP_BAR_LOGO_PRESETS } from "@/ui/topBarLogos";
import EditorShellThemeControls from "@/app/components/EditorShellThemeControls";
import EditorMonacoThemeDropdown from "@/app/components/EditorMonacoThemeDropdown";
import { LiveEditToggleButton } from "@/app/liveEdit/LiveEditToggleButton";
import { TextLogoThemeFields } from "@/app/components/TextLogoThemeFields";
import {
  readOgThemeUiLiveEdit,
  writeOgThemeUiLiveEdit,
  OG_LIVE_EDIT_CHANGED_EVENT,
} from "@/app/synapse-original/ogThemeUi";
import { isEnhancedScriptListEnabled } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";
import { ScriptListThemeFields } from "@/app/editor/script-list/ScriptListThemeFields";

const MAX_IMAGE_BYTES = 1_500_000;

function ColorRow(props: {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}): JSX.Element {
  return (
    <div className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid border-[#313131] bg-[#282827] px-3">
      <div className="relative h-[33px] w-[120px] shrink-0">
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#323232] bg-[#272727]">
          <span
            className="mx-1 inline-block h-[18px] w-[18px] shrink-0 border border-solid border-[#3a3a3a]"
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

export default function SynapseOriginalThemeControlSection() {
  const ogTheme = useOgTheme();
  const { settings: appSettings } = useAppSettings();
  const [appearanceErr, setAppearanceErr] = useState<string | null>(null);
  const [liveEditEnabled, setLiveEditEnabled] = useState(readOgThemeUiLiveEdit);

  useEffect(() => {
    const sync = () => setLiveEditEnabled(readOgThemeUiLiveEdit());
    window.addEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  const overlayFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleOverlayPick = async (file: File) => {
    setAppearanceErr(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      writeOgTheme({ overlayDataUrl: dataUrl });
    } catch (e) {
      setAppearanceErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleLogoPick = async (file: File) => {
    setAppearanceErr(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      writeOgTheme({ logoDataUrl: dataUrl });
    } catch (e) {
      setAppearanceErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleImport = async (file: File) => {
    setAppearanceErr(null);
    const res = await importOgTheme(file);
    if (!res.ok) setAppearanceErr(res.error);
  };

  const handleExport = async () => {
    setAppearanceErr(null);
    const res = await exportOgTheme();
    if (!res.ok) setAppearanceErr(res.error);
  };



  return (
    <div className="flex flex-col gap-2 pb-4">
      {appearanceErr ? (
        <div className="shrink-0 border border-solid border-[#860000] bg-[#4a0000]/50 p-2 text-center font-['Inter:Regular',sans-serif] text-[12px] text-[#ff7676]">
          {appearanceErr}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-[#313131] pb-2 pt-1">
        <div className="min-w-0">
          <span className="font-['Inter:Regular',sans-serif] text-[14px] text-white">Live edit</span>
          <span className="ml-2 font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3]">
            Right-click surfaces in the main window to recolor.
          </span>
        </div>
        <LiveEditToggleButton
          compact
          enabled={liveEditEnabled}
          onChange={(on) => {
            setLiveEditEnabled(on);
            writeOgThemeUiLiveEdit(on);
          }}
        />
      </div>

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-2 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Core Colors
      </div>
      <ColorRow label="Window background" description="Outer fill behind buttons and the editor." value={ogTheme.windowBg} onChange={(hex) => writeOgTheme({ windowBg: hex })} />
      <ColorRow label="Panel background" description="Top bars, side panels, and the script list." value={ogTheme.panelBg} onChange={(hex) => writeOgTheme({ panelBg: hex })} />
      <ColorRow label="Text" description="Top-bar titles, banner, and headers." value={ogTheme.text} onChange={(hex) => writeOgTheme({ text: hex })} />

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Buttons
      </div>
      <ColorRow label="Button Background" description="Normal state for buttons." value={ogTheme.buttonBg} onChange={(hex) => writeOgTheme({ buttonBg: hex })} />
      <ColorRow label="Button Hover" description="Hover state for buttons." value={ogTheme.buttonHoverBg} onChange={(hex) => writeOgTheme({ buttonHoverBg: hex })} />
      <ColorRow label="Button Active" description="Pressed state for buttons." value={ogTheme.buttonActiveBg} onChange={(hex) => writeOgTheme({ buttonActiveBg: hex })} />
      <ColorRow label="Button Border" description="Border around buttons." value={ogTheme.buttonBorder} onChange={(hex) => writeOgTheme({ buttonBorder: hex })} />
      <ColorRow label="Button Text" description="Text color for buttons." value={ogTheme.buttonText} onChange={(hex) => writeOgTheme({ buttonText: hex })} />

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Editor & Tabs
      </div>
      <div className="shrink-0 border-b border-[#313131] pb-1 pt-2 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Editor themes
      </div>
      <div className="mb-3 space-y-3 px-1">
        <EditorMonacoThemeDropdown
          field="editorMonacoThemeIdSynapseOriginal"
          selectClassName="h-[39px] w-full cursor-pointer border border-solid border-[#323232] bg-[#272727] px-2 font-['Inter:Regular',sans-serif] text-[14px] text-white outline-none"
        />
        <EditorShellThemeControls
          compact
          onWrapperBgChange={(hex) => writeOgTheme({ editorBg: hex })}
        />
      </div>
      <ColorRow label="Tab Background" description="Normal state for editor tabs." value={ogTheme.tabBg} onChange={(hex) => writeOgTheme({ tabBg: hex })} />
      <ColorRow label="Tab Active" description="Active state for the selected editor tab." value={ogTheme.tabActiveBg} onChange={(hex) => writeOgTheme({ tabActiveBg: hex })} />
      <ColorRow label="Tab Border" description="Normal state border for editor tabs." value={ogTheme.tabBorder} onChange={(hex) => writeOgTheme({ tabBorder: hex })} />
      <ColorRow label="Tab Active Border" description="Active state border for the selected editor tab." value={ogTheme.tabActiveBorder} onChange={(hex) => writeOgTheme({ tabActiveBorder: hex })} />
      <ColorRow label="Tab Text" description="Text color for editor tabs." value={ogTheme.tabText} onChange={(hex) => writeOgTheme({ tabText: hex })} />

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Lists & Icons
      </div>
      <ColorRow label="List Hover" description="Hover state for script list items." value={ogTheme.listHoverBg} onChange={(hex) => writeOgTheme({ listHoverBg: hex })} />
      <ColorRow label="List Text" description="Text color for script list items." value={ogTheme.listText} onChange={(hex) => writeOgTheme({ listText: hex })} />
      <ColorRow label="Icon Color" description="Color for close, add, and save icons." value={ogTheme.iconColor} onChange={(hex) => writeOgTheme({ iconColor: hex })} />

      {isEnhancedScriptListEnabled(appSettings, "synapseOriginal") ? (
        <>
          <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
            Enhanced Script List
          </div>
          <ScriptListThemeFields
            tokens={ogTheme.scriptList}
            onChange={(partial) => writeOgTheme({ scriptList: partial })}
            ColorRow={ColorRow}
          />
        </>
      ) : null}

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Media
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 border border-solid border-[#313131] bg-[#282827] p-[18px]">
        <div className="flex flex-row items-center gap-3">
          <div className="relative h-[39px] w-[132px] shrink-0">
            <button
              type="button"
              className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
              onClick={() => overlayFileRef.current?.click()}
              aria-label="Choose overlay image"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#323232] bg-[#272727]">
              <span className="text-center font-['Inter:Regular',sans-serif] text-[16px] leading-none text-white">
                {ogTheme.overlayDataUrl ? "Replace..." : "Choose image..."}
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
          <p className="min-w-0 flex-1 font-['Inter:Regular',sans-serif] text-[14px] leading-snug text-[#a3a3a3]">
            Tints the OG main window background.
          </p>
          {ogTheme.overlayDataUrl ? (
            <button
              type="button"
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3] underline hover:text-white"
              onClick={() => writeOgTheme({ overlayDataUrl: null })}
            >
              Remove
            </button>
          ) : null}
        </div>
        <div className="flex flex-row items-center gap-3">
          <span className="w-[80px] font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3]">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(ogTheme.overlayOpacity * 100)}
            onChange={(e) => writeOgTheme({ overlayOpacity: Number(e.target.value) / 100 })}
            className="flex-1 accent-[#3a3a3a]"
            aria-label="Overlay opacity"
          />
          <span className="w-[40px] text-right font-['Inter:Regular',sans-serif] text-[12px] tabular-nums text-[#a3a3a3]">
            {Math.round(ogTheme.overlayOpacity * 100)}%
          </span>
        </div>
        <div className="flex flex-row items-center gap-3 mt-1">
          <span className="w-[80px] font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3]">Mode</span>
          <select
            className="flex-1 h-[24px] border border-solid border-[#313131] bg-[#222] px-1 font-['Inter:Regular',sans-serif] text-[12px] text-white outline-none cursor-pointer"
            value={ogTheme.overlayMode}
            onChange={(e) => writeOgTheme({ overlayMode: e.target.value as "behind" | "top" })}
          >
            <option value="behind">Behind menus</option>
            <option value="top">Above UI (Max 70%)</option>
          </select>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 border border-solid border-[#313131] bg-[#282827] p-[18px]">
        <TextLogoThemeFields
          compact
          fallbackText={DEFAULT_OG_THEME.logoText}
          mode={ogTheme.logoMode}
          onModeChange={(logoMode) => writeOgTheme({ logoMode })}
          text={ogTheme.logoText}
          onTextChange={(logoText) => writeOgTheme({ logoText })}
          color={ogTheme.logoTextColor}
          onColorChange={(logoTextColor) => writeOgTheme({ logoTextColor })}
          fontId={ogTheme.logoTextFontId}
          onFontIdChange={(logoTextFontId) => writeOgTheme({ logoTextFontId })}
          sizePx={ogTheme.logoTextSizePx}
          onSizePxChange={(logoTextSizePx) => writeOgTheme({ logoTextSizePx })}
          weight={ogTheme.logoTextWeight}
          onWeightChange={(logoTextWeight) => writeOgTheme({ logoTextWeight })}
          letterSpacing={ogTheme.logoTextLetterSpacing}
          onLetterSpacingChange={(logoTextLetterSpacing) =>
            writeOgTheme({ logoTextLetterSpacing })
          }
        />
        {ogTheme.logoMode === "image" ? (
        <>
        <div className="flex flex-row items-center gap-3">
          <div className="relative h-[39px] w-[132px] shrink-0">
            <button
              type="button"
              className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
              onClick={() => logoFileRef.current?.click()}
              aria-label="Choose custom logo"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#323232] bg-[#272727]">
              <span className="text-center font-['Inter:Regular',sans-serif] text-[16px] leading-none text-white">
                {ogTheme.logoDataUrl ? "Replace..." : "Custom logo..."}
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
          <p className="min-w-0 flex-1 font-['Inter:Regular',sans-serif] text-[14px] leading-snug text-[#a3a3a3]">
            Replaces the logo on every OG window.
          </p>
          {ogTheme.logoDataUrl ? (
            <button
              type="button"
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3] underline hover:text-white"
              onClick={() => writeOgTheme({ logoDataUrl: null })}
            >
              Remove
            </button>
          ) : null}
        </div>
        
        {/* Preset Logos */}
        {/* Preset Logos */}
        <div className="mt-2 flex flex-row items-center gap-2">
          <span className="font-['Inter:Regular',sans-serif] text-[12px] text-[#a3a3a3] w-[80px]">Preset</span>
          <select
            className="flex-1 h-[24px] border border-solid border-[#313131] bg-[#222] px-1 font-['Inter:Regular',sans-serif] text-[12px] text-white outline-none cursor-pointer"
            value={ogTheme.logoPreset}
            onChange={(e) => writeOgTheme({ logoPreset: e.target.value })}
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

      <div className="shrink-0 border-b border-[#313131] pb-1 pt-4 font-['Inter:Regular',sans-serif] text-[16px] text-white">
        Manage Theme
      </div>
      <div className="flex flex-row items-center gap-3 pb-4">
        <div className="relative h-[39px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => importFileRef.current?.click()}
            aria-label="Import theme"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#323232] bg-[#272727]">
            <span className="text-center font-['Inter:Regular',sans-serif] text-[16px] leading-none text-white">
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
        
        <div className="relative h-[39px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => void handleExport()}
            aria-label="Export theme"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#323232] bg-[#272727]">
            <span className="text-center font-['Inter:Regular',sans-serif] text-[16px] leading-none text-white">
              Export
            </span>
          </div>
        </div>

        <div className="relative h-[39px] flex-1 shrink-0">
          <button
            type="button"
            className="absolute inset-0 z-[3] cursor-pointer border-0 bg-transparent p-0"
            onClick={() => {
              setAppearanceErr(null);
              resetOgTheme();
            }}
            aria-label="Reset theme to defaults"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#6a2525] bg-[#3a1515]">
            <span className="text-center font-['Inter:Regular',sans-serif] text-[16px] leading-none text-white">
              Reset
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
