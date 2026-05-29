import { useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { useAppSettings } from "@/app/useAppSettings";
import { DEFAULT_MINIMAP_SCALE, shouldApplyEdgeCurve } from "@/app/appSettings";
import { MinimapSizeSettingsSynapseX } from "@/app/components/settings/MinimapSizeSettings";
import { applyAlwaysOnTopGlobally } from "@/app/synapse-original/lib/alwaysOnTop";
import {
  closeAllSynapseXSubWindows,
} from "@/app/synapse-x/windowOps";
import SynapseXChrome from "@/app/synapse-x/SynapseXChrome";
import SynapseXThemeControlSection from "@/app/synapse-x/components/SynapseXThemeControlSection";
import { useSettingsFullscreenState } from "@/app/hooks/useSettingsFullscreenState";
import SettingsPreviewPanel from "@/app/components/SettingsPreviewPanel";
import { useWindowScale } from "@/app/hooks/useWindowScale";
import { reloadMainWebview } from "@/app/crossWindowSync";

type SidebarTab = "general" | "theme";

const MAX_IMAGE_BYTES = 1_500_000;

const PANEL_BG = "var(--sx-panel-bg, #3C3C3C)";
const WINDOW_BG = "var(--sx-window-bg, #333333)";

/**
 * Synapse X Options window — port of `SynapseOriginalSettingsPage` restyled with the WPF
 * `#333333` / `#3C3C3C` chrome. Sidebar tabs: General / Theme; bottom
 * Apply + Close. Drops the OG "Synapse Framework website" row entirely. The Theme
 * tab persists to the independent `synapseXTheme` store so OG and Synapse X don't
 * clobber each other.
 */
export default function SynapseXSettingsPage() {
  const { settings, update } = useAppSettings();
  const [sidebar, setSidebar] = useState<SidebarTab>("general");
  const { isMaximized, showPreview, onScroll } = useSettingsFullscreenState();
  const scale = useWindowScale(528, 460, isMaximized);

  const closeWindow = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().close();
  }, []);

  const goOgUi = useCallback(() => {
    update({ uiMode: "synapseOriginal" });
    void closeAllSynapseXSubWindows();
  }, [update]);

  const goDefaultUi = useCallback(() => {
    update({ uiMode: "default" });
    void closeAllSynapseXSubWindows();
  }, [update]);

  const goV3Ui = useCallback(() => {
    update({ uiMode: "synapseV3" });
    void closeAllSynapseXSubWindows();
  }, [update]);



  const toggleLabel = (on: boolean) => (
    <span className={on ? "text-[#5a9e5f]" : "text-[#cf6363]"}>{on ? "ON" : "OFF"}</span>
  );

  return (
    <div 
      className="flex h-full w-full flex-row overflow-hidden" 
      style={{ backgroundColor: WINDOW_BG }}
      onScroll={onScroll}
    >
      <div 
        className="relative shrink-0 transition-transform duration-300" 
        style={{ 
          width: 528, 
          height: 460,
          margin: isMaximized ? "auto" : undefined,
          transform: isMaximized ? `scale(${scale})` : undefined,
          transformOrigin: "center"
        }} 
        data-name="Options"
      >
        <SynapseXChrome title="Synapse X - Options" variant="options" onClose={closeWindow}>
          <div className="flex h-full min-h-0 flex-row" style={{ backgroundColor: WINDOW_BG }}>
            {/* Sidebar */}
            <nav
              className="flex w-[110px] shrink-0 flex-col gap-1 border-r border-black/30 p-2"
              style={{ backgroundColor: PANEL_BG }}
            >
              <SidebarBtn label="General" active={sidebar === "general"} onClick={() => setSidebar("general")} />
              <SidebarBtn label="Theme" active={sidebar === "theme"} onClick={() => setSidebar("theme")} />
            </nav>

            {/* Right panel */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sx-scroll">
                {sidebar === "general" ? (
                  <div className="flex flex-col gap-2">
                    <ToggleRow
                      label="Auto Attach"
                      description="Automatically attach to any client(s)."
                      pressed={settings.autoAttach}
                      onClick={() => update({ autoAttach: !settings.autoAttach })}
                      badge={toggleLabel(settings.autoAttach)}
                    />
                    <DropdownRow
                      label="Bridge Method"
                      description="Auto-detects MacSploit or Opiumware over the macOS TCP bridge."
                      value={settings.bridgeMethod}
                      onChange={(v) => update({ bridgeMethod: v })}
                      options={[
                        { value: "macos", label: "macOS TCP" },
                      ]}
                    />
                    <ToggleRow
                      label="Top Most"
                      description="All Synapse windows to stay on top."
                      pressed={settings.alwaysOnTop}
                      onClick={() => {
                        const next = !settings.alwaysOnTop;
                        if (isTauriApp()) {
                          void applyAlwaysOnTopGlobally(next);
                        } else {
                          update({ alwaysOnTop: next });
                        }
                      }}
                      badge={toggleLabel(settings.alwaysOnTop)}
                    />
                    <ToggleRow
                      label="Enhanced List"
                      description="Search, sections, bookmarks, gists, row actions, and full script-list theming."
                      pressed={settings.enhancedScriptListSynapseX ?? false}
                      onClick={() => {
                        const next = !(settings.enhancedScriptListSynapseX ?? false);
                        update({ enhancedScriptListSynapseX: next });
                        void reloadMainWebview();
                      }}
                      badge={toggleLabel(settings.enhancedScriptListSynapseX ?? false)}
                    />
                    <ToggleRow
                      label="Minimap"
                      description="Show a miniature preview of the entire script on the right side."
                      pressed={settings.minimapEnabled}
                      onClick={() => update({ minimapEnabled: !settings.minimapEnabled })}
                      badge={toggleLabel(settings.minimapEnabled)}
                    />
                    <MinimapSizeSettingsSynapseX
                      enabled={settings.minimapEnabled}
                      scale={settings.minimapScale}
                      onScaleChange={(minimapScale) => update({ minimapScale })}
                      onReset={() => update({ minimapScale: DEFAULT_MINIMAP_SCALE })}
                    />
                    <ToggleRow
                      label="Error Logging"
                      description="EXPERIMENTAL - CAN SHOW FALSE ERRORS. Displays syntax errors inside the editor using a Luau diagnostics engine."
                      pressed={settings.errorLoggingEnabled}
                      onClick={() => update({ errorLoggingEnabled: !settings.errorLoggingEnabled })}
                      badge={toggleLabel(settings.errorLoggingEnabled)}
                    />
                    <ToggleRow
                      label="Resizable"
                      description="Allow dragging the Synapse X main window edges to resize. Off snaps it back to the default 801x355."
                      pressed={settings.resizableWindow}
                      onClick={() => update({ resizableWindow: !settings.resizableWindow })}
                      badge={toggleLabel(settings.resizableWindow)}
                    />
                    <ToggleRow
                      label="Edge Curve"
                      description="Apply Windows 11 rounded corners to the Synapse X window. Off makes the corners sharp and square."
                      pressed={shouldApplyEdgeCurve(settings)}
                      onClick={() => {
                        const current = shouldApplyEdgeCurve(settings);
                        update({ edgeCurveSynapseX: !current });
                      }}
                      badge={toggleLabel(shouldApplyEdgeCurve(settings))}
                    />
                    <ToggleRow
                      label="Synapse 2017"
                      description="Switch to the Synapse 2017 multi-window UI."
                      pressed={false}
                      onClick={goOgUi}
                      badge={<span className="text-[#cf6363]">OFF</span>}
                    />
                    <ToggleRow
                      label="Synapse Blue"
                      description="Return to the Synapse Blue desktop UI."
                      pressed={false}
                      onClick={goDefaultUi}
                      badge={<span className="text-[#cf6363]">OFF</span>}
                    />
                    <ToggleRow
                      label="Synapse v3"
                      description="Switch to the Synapse v3 UI."
                      pressed={false}
                      onClick={goV3Ui}
                      badge={<span className="text-[#cf6363]">OFF</span>}
                    />
                  </div>
                ) : null}

                {sidebar === "theme" ? <SynapseXThemeControlSection /> : null}
              </div>

              {/* Close footer — Apply is gone because every toggle auto-applies
                  via `useAppSettings.update()` the instant it changes. */}
              <div className="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-black/30 px-3 py-2">
                <button
                  type="button"
                  onClick={closeWindow}
                  className="h-[29px] min-w-[88px] cursor-pointer border border-solid border-[#2a2a2a] px-3 text-[13px] hover:brightness-110"
                  style={{ backgroundColor: PANEL_BG, color: "var(--sx-text, #ffffff)" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </SynapseXChrome>
      </div>

      <SettingsPreviewPanel 
        visible={showPreview} 
        className="absolute left-[528px] top-0 bottom-0 z-[60]"
        shell="synapseX"
      />
    </div>
  );
}

function SidebarBtn(props: { label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={props.active}
      onClick={props.onClick}
      className="flex h-[30px] cursor-pointer items-center justify-center border border-solid px-2 text-[13px] hover:brightness-110"
      style={{
        backgroundColor: props.active ? "#4a4a4a" : "var(--sx-panel-bg, #3C3C3C)",
        borderColor: props.active ? "#5a5a5a" : "#2a2a2a",
        color: "var(--sx-text, #ffffff)",
      }}
    >
      {props.label}
    </button>
  );
}

/**
 * Synapse X-styled select row. Used for the bridge method picker — looks like a
 * `ToggleRow` but the trailing badge is replaced by a native `<select>` styled
 * to match the WPF chrome.
 */
function DropdownRow<T extends string>(props: {
  label: string;
  description: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}): JSX.Element {
  return (
    <div
      className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid border-[#2a2a2a] px-3"
      style={{ backgroundColor: PANEL_BG }}
    >
      <div className="relative h-[33px] w-[120px] shrink-0">
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] bg-[#2d2d2d]">
          <span className="text-center font-sans text-[14px] leading-none text-white">{props.label}</span>
        </div>
      </div>
      <p className="min-w-0 flex-1 pl-3 font-sans text-[12px] leading-snug text-[#a3a3a3]">{props.description}</p>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        className="ml-2 h-[26px] cursor-pointer border border-solid border-[#2a2a2a] bg-[#2d2d2d] px-1 font-sans text-[12px] text-white outline-none"
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow(props: {
  label: string;
  description: string;
  pressed: boolean;
  onClick: () => void;
  badge: JSX.Element;
  disabled?: boolean;
}): JSX.Element {
  return (
    <div
      className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid border-[#2a2a2a] px-3"
      style={{ backgroundColor: PANEL_BG }}
    >
      <div className="relative h-[33px] w-[120px] shrink-0">
        <button
          type="button"
          className={`absolute inset-0 z-[3] border-0 bg-transparent p-0 ${props.disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          aria-pressed={props.pressed}
          disabled={props.disabled}
          onClick={props.disabled ? undefined : props.onClick}
          aria-label={`Toggle ${props.label}`}
        />
        <div className={`pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid border-[#2a2a2a] ${props.disabled ? "bg-[#333] opacity-50" : "bg-[#2d2d2d]"}`}>
          <span className="text-center font-sans text-[14px] leading-none text-white">{props.label}</span>
        </div>
      </div>
      <p className="min-w-0 flex-1 pl-3 font-sans text-[12px] leading-snug text-[#a3a3a3]">{props.description}</p>
      <span className="shrink-0 self-center pl-1 font-sans text-[12px]">{props.badge}</span>
    </div>
  );
}
