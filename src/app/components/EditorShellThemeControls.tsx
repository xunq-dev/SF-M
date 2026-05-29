import { useCallback, useEffect, useState } from "react";
import {
  EDITOR_THEME_CHANGED_EVENT,
  readShellCustomEditorBg,
  readStoredEditorThemeId,
  writeStoredEditorThemeId,
  applyShellEditorBackground,
  syncCustomBgFromPreset,
  shellEditorBgMatchesPreset,
  SHELL_CUSTOM_EDITOR_THEME_ID,
} from "@/editor/editorThemes";
import { listV3PresetIds, V3_PRESET_LABELS, type V3ThemePresetId } from "@/app/synapse-v3/v3ThemeDerivation";

type Props = {
  /** When true (V3 only), show Framework / Novo / … editor background presets. */
  showV3Presets?: boolean;
  /** Sync v3 theme `editor.workAreaBg` (Monaco canvas uses the same hex). */
  onWrapperBgChange?: (hex: string) => void;
  /** Sync v3 theme `editor.monacoThemeId` + work area when a shell preset is picked. */
  onThemeSelect?: (themeId: string, editorBgHex: string) => void;
  compact?: boolean;
};

export default function EditorShellThemeControls({
  showV3Presets = false,
  onWrapperBgChange,
  onThemeSelect,
  compact,
}: Props) {
  const [activeId, setActiveId] = useState(readStoredEditorThemeId);
  const [customBg, setCustomBg] = useState(readShellCustomEditorBg);

  useEffect(() => {
    const sync = () => {
      setActiveId(readStoredEditorThemeId());
      setCustomBg(readShellCustomEditorBg());
    };
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
  }, []);

  const applyBg = useCallback(
    async (hex: string) => {
      setCustomBg(hex);
      writeStoredEditorThemeId(SHELL_CUSTOM_EDITOR_THEME_ID);
      setActiveId(SHELL_CUSTOM_EDITOR_THEME_ID);
      onWrapperBgChange?.(hex);
      onThemeSelect?.(SHELL_CUSTOM_EDITOR_THEME_ID, hex);
      await applyShellEditorBackground(hex, SHELL_CUSTOM_EDITOR_THEME_ID);
    },
    [onWrapperBgChange, onThemeSelect],
  );

  const selectPreset = useCallback(
    (presetId: V3ThemePresetId) => {
      const hex = syncCustomBgFromPreset(presetId);
      void applyBg(hex);
    },
    [applyBg],
  );

  const onCustomBg = useCallback(
    (hex: string) => {
      void applyBg(hex);
    },
    [applyBg],
  );

  const customActive =
    activeId === SHELL_CUSTOM_EDITOR_THEME_ID &&
    !listV3PresetIds().some((id) => shellEditorBgMatchesPreset(customBg, id));

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {showV3Presets ? (
        <>
          <p
            className={compact ? "text-[11px] text-[#a3a3a3]" : "text-[13px]"}
            style={{ color: "var(--v3-settings-desc, #6b6b6b)" }}
          >
            VS Dark syntax — each preset sets a distinct editor background (Framework uses standard
            #1e1e1e).
          </p>
          <div className={`grid gap-[6px] ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
            {listV3PresetIds().map((presetId) => {
              const isActive =
                shellEditorBgMatchesPreset(customBg, presetId) &&
                activeId === SHELL_CUSTOM_EDITOR_THEME_ID;
              return (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => selectPreset(presetId)}
                  className="rounded-[4px] border border-solid px-2 py-1.5 text-left text-[11px] transition-all"
                  style={{
                    background: isActive
                      ? "rgba(55,55,55,0.35)"
                      : "var(--v3-editor-tab-inactive, #2a2a2a)",
                    borderColor: isActive
                      ? "var(--v3-accent-selection-border, #225a7a)"
                      : "var(--v3-editor-tab-border, #3a3a3a)",
                    color: isActive
                      ? "var(--v3-accent-muted, #b0d8e5)"
                      : "var(--v3-settings-label, #c0c0c0)",
                  }}
                >
                  {V3_PRESET_LABELS[presetId]}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      <div
        className="flex items-center gap-3 rounded-[4px] border border-solid px-3 py-2"
        style={{
          borderColor: "var(--v3-editor-tab-border, #3a3a3a)",
          background: "var(--v3-editor-tab-inactive, #2a2a2a)",
        }}
      >
        <div className="relative h-[36px] w-[100px] shrink-0">
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center gap-1 rounded-[3px] border border-solid"
            style={{
              borderColor: "var(--v3-editor-tab-border, #3a3a3a)",
              background: "var(--v3-settings-checkbox-off, #212120)",
            }}
          >
            <span
              className="inline-block h-[18px] w-[18px] border border-black/30"
              style={{ backgroundColor: customBg }}
            />
            <span className="font-mono text-[10px] text-white">Custom</span>
          </div>
          <input
            type="color"
            value={customBg}
            onChange={(e) => void onCustomBg(e.target.value)}
            aria-label="Custom editor background"
            className="absolute inset-0 z-[3] h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]" style={{ color: "var(--v3-settings-label, #fff)" }}>
            Custom background
          </p>
          <p className="text-[11px]" style={{ color: "var(--v3-settings-desc, #6b6b6b)" }}>
            {showV3Presets
              ? "Same VS Dark text; presets update this colour and the live editor."
              : "VS Dark syntax with your chosen canvas colour."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void applyBg(customBg)}
          className="shrink-0 rounded border border-solid px-2 py-1 text-[11px] text-white"
          style={{
            borderColor: customActive
              ? "var(--v3-accent-selection-border, #225a7a)"
              : "var(--v3-editor-tab-border, #3a3a3a)",
          }}
        >
          Use custom editor
        </button>
      </div>
    </div>
  );
}
