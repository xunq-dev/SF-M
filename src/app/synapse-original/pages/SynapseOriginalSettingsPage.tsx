import { useCallback, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";
import { useAppSettings } from "@/app/useAppSettings";
import { DEFAULT_MINIMAP_SCALE, shouldApplyEdgeCurve } from "@/app/appSettings";
import { MinimapSizeSettingsSynapseOriginal } from "@/app/components/settings/MinimapSizeSettings";
import { applyAlwaysOnTopGlobally } from "@/app/synapse-original/lib/alwaysOnTop";
import { closeAllSynapseOriginalSubWindows } from "@/app/synapse-original/windowOps";
import SynapseOriginalOptionsChrome from "@/app/synapse-original/components/SynapseOriginalOptionsChrome";
import SynapseOriginalThemeControlSection from "@/app/synapse-original/components/SynapseOriginalThemeControlSection";
import { useSettingsFullscreenState } from "@/app/hooks/useSettingsFullscreenState";
import SettingsPreviewPanel from "@/app/components/SettingsPreviewPanel";
import { useWindowScale } from "@/app/hooks/useWindowScale";
import { reloadMainWebview } from "@/app/crossWindowSync";

type SidebarTab = "general" | "theme";

const PANEL_BG = "var(--og-panel-bg, #282828)";
const WINDOW_BG = "var(--og-window-bg, #232323)";
const ROW_BG = "#282827";
const ROW_BORDER = "#313131";
const CHIP_BG = "#272727";
const CHIP_BORDER = "#323232";

/**
 * Synapse 2017 Settings & Clients — flex layout matching Synapse X Options,
 * with OG palette and `SynapseOriginalThemeControlSection` on the Theme tab.
 */
export default function SynapseOriginalSettingsPage() {
  const { settings, update } = useAppSettings();
  const [sidebar, setSidebar] = useState<SidebarTab>("general");
  const { isMaximized, showPreview, onScroll } = useSettingsFullscreenState();
  const scale = useWindowScale(649, 705, isMaximized);

  const closeWindow = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().close();
  }, []);

  const leaveSynapseOriginalMode = useCallback(() => {
    update({ uiMode: "default" });
    void closeAllSynapseOriginalSubWindows();
  }, [update]);

  const goToSynapseXMode = useCallback(() => {
    update({ uiMode: "synapseX" });
    void closeAllSynapseOriginalSubWindows();
  }, [update]);

  const goToSynapseV3Mode = useCallback(() => {
    update({ uiMode: "synapseV3" });
    void closeAllSynapseOriginalSubWindows();
  }, [update]);

  const toggleLabel = (on: boolean) => (
    <span className={on ? "text-[#008b00]" : "text-[#860000]"}>{on ? "ON" : "OFF"}</span>
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
          width: 649,
          height: 705,
          margin: isMaximized ? "auto" : undefined,
          transform: isMaximized ? `scale(${scale})` : undefined,
          transformOrigin: "center",
        }}
        data-name="Settings & Clients"
      >
        <SynapseOriginalOptionsChrome title="Settings & Clients" onClose={closeWindow}>
          <div className="flex h-full min-h-0 flex-row" style={{ backgroundColor: WINDOW_BG }}>
            <nav
              className="flex w-[110px] shrink-0 flex-col gap-1 border-r border-[#424242] p-2"
              style={{ backgroundColor: PANEL_BG }}
            >
              <SidebarBtn label="General" active={sidebar === "general"} onClick={() => setSidebar("general")} />
              <SidebarBtn label="Theme" active={sidebar === "theme"} onClick={() => setSidebar("theme")} />
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 og-scroll">
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
                      pressed={settings.enhancedScriptListSynapseOriginal ?? false}
                      onClick={() => {
                        const next = !(settings.enhancedScriptListSynapseOriginal ?? false);
                        update({ enhancedScriptListSynapseOriginal: next });
                        void reloadMainWebview();
                      }}
                      badge={toggleLabel(settings.enhancedScriptListSynapseOriginal ?? false)}
                    />
                    <ToggleRow
                      label="Minimap"
                      description="Show a miniature preview of the entire script on the right side."
                      pressed={settings.minimapEnabled}
                      onClick={() => update({ minimapEnabled: !settings.minimapEnabled })}
                      badge={toggleLabel(settings.minimapEnabled)}
                    />
                    <MinimapSizeSettingsSynapseOriginal
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
                      description="Allow dragging the OG main window edges to resize. Off snaps it back to the default 838×372."
                      pressed={settings.resizableWindow}
                      onClick={() => update({ resizableWindow: !settings.resizableWindow })}
                      badge={toggleLabel(settings.resizableWindow)}
                    />
                    <ToggleRow
                      label="Edge Curve"
                      description="Apply Windows 11 rounded corners to OG windows. Off makes the corners sharp and square."
                      pressed={shouldApplyEdgeCurve(settings)}
                      onClick={() => {
                        const current = shouldApplyEdgeCurve(settings);
                        update({ edgeCurveSynapseOriginal: !current });
                      }}
                      badge={toggleLabel(shouldApplyEdgeCurve(settings))}
                    />
                    <ToggleRow
                      label="Synapse X"
                      description="Switch to the Synapse X UI."
                      pressed={false}
                      onClick={goToSynapseXMode}
                      badge={<span className="text-[#860000]">OFF</span>}
                    />
                    <ToggleRow
                      label="Synapse Blue"
                      description="Return to the Synapse Blue desktop UI."
                      pressed={false}
                      onClick={leaveSynapseOriginalMode}
                      badge={<span className="text-[#860000]">OFF</span>}
                    />
                    <ToggleRow
                      label="Synapse v3"
                      description="Switch to the Synapse v3 UI."
                      pressed={false}
                      onClick={goToSynapseV3Mode}
                      badge={<span className="text-[#860000]">OFF</span>}
                    />
                  </div>
                ) : null}

                {sidebar === "theme" ? <SynapseOriginalThemeControlSection /> : null}
              </div>

              <div className="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-[#424242] px-3 py-2">
                <button
                  type="button"
                  onClick={closeWindow}
                  className="h-[29px] min-w-[88px] cursor-pointer border border-solid px-3 text-[13px] hover:brightness-110"
                  style={{
                    backgroundColor: CHIP_BG,
                    borderColor: CHIP_BORDER,
                    color: "var(--og-text, #ffffff)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </SynapseOriginalOptionsChrome>
      </div>

      <SettingsPreviewPanel
        visible={showPreview}
        className="absolute left-[649px] top-0 bottom-0 z-[60]"
        shell="synapseOriginal"
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
        backgroundColor: props.active ? "#323232" : PANEL_BG,
        borderColor: props.active ? "#3a3a3a" : CHIP_BORDER,
        color: "var(--og-text, #ffffff)",
      }}
    >
      {props.label}
    </button>
  );
}

function DropdownRow<T extends string>(props: {
  label: string;
  description: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}): JSX.Element {
  return (
    <div
      className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid px-3"
      style={{ backgroundColor: ROW_BG, borderColor: ROW_BORDER }}
    >
      <div className="relative h-[33px] w-[120px] shrink-0">
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid"
          style={{ backgroundColor: CHIP_BG, borderColor: CHIP_BORDER }}
        >
          <span className="text-center font-sans text-[13px] leading-none text-white">{props.label}</span>
        </div>
      </div>
      <p className="min-w-0 flex-1 pl-3 font-sans text-[12px] leading-snug text-[#a3a3a3]">{props.description}</p>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        className="ml-2 h-[26px] cursor-pointer border border-solid px-1 font-sans text-[12px] text-white outline-none"
        style={{ backgroundColor: "#222", borderColor: ROW_BORDER }}
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
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
      className="flex h-[60px] w-full shrink-0 flex-row items-center gap-0 border border-solid px-3"
      style={{ backgroundColor: ROW_BG, borderColor: ROW_BORDER }}
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
        <div
          className={`pointer-events-none absolute inset-0 z-[2] flex items-center justify-center border border-solid ${props.disabled ? "opacity-50" : ""}`}
          style={{ backgroundColor: CHIP_BG, borderColor: CHIP_BORDER }}
        >
          <span className="text-center font-sans text-[13px] leading-none text-white">{props.label}</span>
        </div>
      </div>
      <p className="min-w-0 flex-1 pl-3 font-sans text-[12px] leading-snug text-[#a3a3a3]">{props.description}</p>
      <span className="shrink-0 self-center pl-1 font-sans text-[12px]">{props.badge}</span>
    </div>
  );
}
