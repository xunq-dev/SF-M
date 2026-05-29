import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import svgSettingsPaths from "../remake-assets/settings-svg-paths/v3-settings-svg-paths";
import { V3TopBar } from "./V3TopBar";
import { DEFAULT_MINIMAP_SCALE } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";
import { MinimapSizeSettingsV3 } from "@/app/components/settings/MinimapSizeSettings";

import { isTauriApp } from "@/app/tauriEnv";
import { applyAlwaysOnTopGlobally } from "@/app/synapse-original/lib/alwaysOnTop";
import {
  V3SettingCheckbox,
  V3SectionHeader,
  V3SettingRow,
} from "./v3SettingsUi";
import type { V3Page } from "../v3PageTypes";
import { useV3Theme } from "../v3Theme";
import { v3ThemeInlineVars } from "../v3ThemeCss";
import { useV3Settings, writeV3Settings, type V3Settings } from "../v3Settings";
import { V3AiModelSettingsFields } from "./V3AiModelSettingsFields";

type Page = V3Page;

interface SettingsPageProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

type SettingsSidebarItem = "application" | "editor" | "terminal" | "layers" | "config";

/** Map sidebar IDs to the section header element IDs for scroll linking */
const SECTION_IDS: Record<SettingsSidebarItem, string> = {
  application: "v3-section-application",
  editor: "v3-section-editor",
  terminal: "v3-section-terminal",
  layers: "v3-section-layers",
  config: "v3-section-config",
};

const controlBtnStyle: React.CSSProperties = {
  background: "var(--v3-settings-control-bg, #373737)",
  borderColor: "var(--v3-settings-control-border, #3d3d3c)",
  color: "var(--v3-settings-control-text, #ffffff)",
  fontFamily: "Inter, sans-serif",
};

export function V3SettingsPage({ currentPage, onNavigate }: SettingsPageProps) {
  const theme = useV3Theme();
  const themeVars = useMemo(() => v3ThemeInlineVars(theme), [theme]);
  const { settings, update } = useAppSettings();
  const navigate = useNavigate();
  const sidebarIconColor = "var(--v3-settings-sidebar-icon, #8d8d8d)";

  const switchUiMode = (mode: "default" | "synapseX" | "synapseOriginal") => {
    update({ uiMode: mode });
    if (mode === "default") navigate("/");
    else if (mode === "synapseX") navigate("/synapse-x/main");
    else if (mode === "synapseOriginal") navigate("/synapse-original/main");
  };

  const v3s = useV3Settings();
  const [activeSidebarItem, setActiveSidebarItem] = useState<SettingsSidebarItem>("application");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(true);

  const updateV3 = useCallback((partial: Partial<V3Settings>) => {
    writeV3Settings(partial);
  }, []);

  // Scroll-spy: track which section is currently visible
  const handleScroll = useCallback(() => {
    if (!isUserScrolling.current) return;
    const container = scrollRef.current;
    if (!container) return;

    const sectionOrder: SettingsSidebarItem[] = ["application", "editor", "terminal", "layers", "config"];
    let current: SettingsSidebarItem = "application";

    for (const sid of sectionOrder) {
      const el = document.getElementById(SECTION_IDS[sid]);
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top - containerRect.top <= 40) {
          current = sid;
        }
      }
    }
    setActiveSidebarItem(current);
  }, []);

  // Click sidebar → scroll to section
  const scrollToSection = useCallback((id: SettingsSidebarItem) => {
    const el = document.getElementById(SECTION_IDS[id]);
    if (el) {
      isUserScrolling.current = false;
      setActiveSidebarItem(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { isUserScrolling.current = true; }, 600);
    }
  }, []);

  const sidebarItems: {
    id: SettingsSidebarItem;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      id: "application",
      label: "Application",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p22158a00} fill="white" />
        </svg>
      ),
    },
    {
      id: "editor",
      label: "Editor",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p3d81380} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "terminal",
      label: "Terminal",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p81c9680} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "layers",
      label: "Layers",
      icon: (
        <svg viewBox="0 0 17.2 17.2" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p15678900} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
        </svg>
      ),
    },
    {
      id: "config",
      label: "Config",
      icon: (
        <svg viewBox="0 0 18 18" width={18} height={18} fill="none">
          <path d={svgSettingsPaths.p2c41aa80} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="size-full relative" style={themeVars}>
      {/* TopBar */}
      <V3TopBar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Settings content area */}
      <div
        className="absolute overflow-hidden"
        data-v3-live="shell.pageBg"
        style={{
          left: 58,
          top: 43,
          right: 0,
          bottom: 0,
          background: "var(--v3-shell-page-bg, #151515)",
          borderBottomRightRadius: 7,
        }}
      >
        {/* Scrollable content with scroll-spy */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            overflowY: "auto",
            padding: "8px 10px 16px 10px",
            scrollbarWidth: "thin",
            scrollbarColor: "#808080 transparent",
          }}
        >
          {/* ══ APPLICATION section ══ */}
          <V3SectionHeader
            id={SECTION_IDS.application}
            liveEditPath="settingsChrome.sectionHeaderBg"
            icon={
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d={svgSettingsPaths.p36efbf80} fill="white" />
              </svg>
            }
            title="Application"
          />

          <V3SettingRow
            label="Reset all settings"
            description="Pressing this button will reset all settings and close the application."
            control={
              <button
                className="rounded-[4px] border border-solid transition-colors hover:opacity-90"
                data-v3-live="settingsChrome.controlBg"
                style={{ ...controlBtnStyle, width: 70, height: 33, fontSize: 14, fontWeight: 400 }}
              >
                Reset
              </button>
            }
          />

          <V3SettingRow
            label="Show changelog"
            description="Clicking this will show you the changelog for the latest version."
            control={
              <button
                className="rounded-[4px] border border-solid transition-colors hover:opacity-90"
                data-v3-live="settingsChrome.controlBg"
                style={{ ...controlBtnStyle, width: 70, height: 33, fontSize: 14, fontWeight: 400 }}
              >
                Show
              </button>
            }
          />

          <V3SettingRow
            label="Top Most"
            description="All Synapse windows to stay on top."
            control={
              <V3SettingCheckbox
                value={settings.alwaysOnTop}
                liveEditPath="settingsChrome.checkboxOn"
                onChange={(v) => {
                  if (isTauriApp()) {
                    void applyAlwaysOnTopGlobally(v);
                  } else {
                    update({ alwaysOnTop: v });
                  }
                }}
              />
            }
          />

          <V3SettingRow
            label="Resizable"
            description="Allow dragging the window edges to resize."
            control={
              <V3SettingCheckbox
                value={settings.resizableWindow}
                onChange={(v) => update({ resizableWindow: v })}
              />
            }
          />

          <V3SettingRow
            label="Bridge method"
            description="Synapse uses the macOS TCP executor bridge and automatically detects MacSploit or Opiumware."
            control={
              <select
                value={settings.bridgeMethod}
                onChange={(e) => update({ bridgeMethod: e.target.value as any })}
                className="rounded-[4px] border border-solid px-2 outline-none cursor-pointer"
                style={{ ...controlBtnStyle, height: 33, fontSize: 14, fontWeight: 400, minWidth: 130 }}
              >
                <option value="macos">macOS TCP Executor</option>
              </select>
            }
          />

          <div className="mb-[22px]">
            <p
              className="mb-[4px]"
              style={{
                fontSize: 14,
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                color: "var(--v3-settings-label, #ffffff)",
              }}
            >
              UI Mode
            </p>
            <p
              className="mb-3"
              style={{
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                color: "var(--v3-settings-desc, #6b6b6b)",
              }}
            >
              Switch to a different UI shell.
            </p>
            <div className="flex gap-[4px]">
              <button
                onClick={() => switchUiMode("default")}
                className="rounded-[4px] border border-solid transition-colors hover:opacity-90 px-4"
                style={{ ...controlBtnStyle, height: 33, fontSize: 13 }}
              >
                Synapse Blue
              </button>
              <button
                onClick={() => switchUiMode("synapseX")}
                className="rounded-[4px] border border-solid transition-colors hover:opacity-90 px-4"
                style={{ ...controlBtnStyle, height: 33, fontSize: 13 }}
              >
                Synapse X
              </button>
              <button
                onClick={() => switchUiMode("synapseOriginal")}
                className="rounded-[4px] border border-solid transition-colors hover:opacity-90 px-4"
                style={{ ...controlBtnStyle, height: 33, fontSize: 13 }}
              >
                Synapse OG
              </button>
            </div>
          </div>

          {/* ══ EDITOR section ══ */}
          <V3SectionHeader
            id={SECTION_IDS.editor}
            liveEditPath="settingsChrome.sectionHeaderBg"
            icon={
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d={svgSettingsPaths.p11c07600} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
              </svg>
            }
            title="Editor"
          />

          <V3SettingRow
            label="Toggle script list"
            description="Optional — hide the editor script list panel. Not recommended; bookmarks, gists, and quick script access live there."
            control={
              <V3SettingCheckbox
                value={settings.enhancedScriptListSynapseV3 ?? true}
                onChange={(v) => update({ enhancedScriptListSynapseV3: v })}
              />
            }
          />

          <V3SettingRow
            label="Minimap"
            description="Show a miniature preview of the entire script on the right side."
            control={
              <V3SettingCheckbox
                value={settings.minimapEnabled}
                onChange={(v) => update({ minimapEnabled: v })}
              />
            }
          />

          <MinimapSizeSettingsV3
            enabled={settings.minimapEnabled}
            scale={settings.minimapScale}
            onScaleChange={(minimapScale) => update({ minimapScale })}
            onReset={() => update({ minimapScale: DEFAULT_MINIMAP_SCALE })}
          />

          <V3SettingRow
            label="Error Logging"
            description="EXPERIMENTAL - CAN SHOW FALSE ERRORS. Displays syntax errors inside the editor using a Luau diagnostics engine."
            control={
              <V3SettingCheckbox
                value={settings.errorLoggingEnabled}
                onChange={(v) => update({ errorLoggingEnabled: v })}
              />
            }
          />

          <V3SettingRow
            label="AI features"
            description="SynapseAI assistant and related editor tooling."
            control={
              <V3SettingCheckbox
                value={v3s.aiFeatures}
                onChange={(v) => updateV3({ aiFeatures: v })}
              />
            }
          />

          {v3s.aiFeatures && <V3AiModelSettingsFields />}

          <V3SettingRow
            label="Compact editor buttons"
            description="Reduces the size of editor buttons."
            control={
              <V3SettingCheckbox value={v3s.compactButtons} onChange={(v) => updateV3({ compactButtons: v })} />
            }
          />

          <V3SettingRow
            label="Compact tabs"
            description="Use compact square tabs instead of round padded ones."
            control={
              <V3SettingCheckbox value={v3s.compactTabs} onChange={(v) => updateV3({ compactTabs: v })} />
            }
          />

          {/* ══ TERMINAL section ══ */}
          <V3SectionHeader
            id={SECTION_IDS.terminal}
            liveEditPath="settingsChrome.sectionHeaderBg"
            icon={
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d={svgSettingsPaths.p81c9680} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
              </svg>
            }
            title="Terminal"
          />
          <div className="mb-[22px]">
            <p
              className="italic"
              style={{
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-settings-desc, #6b6b6b)",
              }}
            >
              Terminal settings are coming soon for Synapse v3.
            </p>
          </div>

          {/* ══ LAYERS section ══ */}
          <V3SectionHeader
            id={SECTION_IDS.layers}
            liveEditPath="settingsChrome.sectionHeaderBg"
            icon={
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d={svgSettingsPaths.p15678900} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
              </svg>
            }
            title="Layers"
          />
          <div className="mb-[22px]">
            <p
              className="italic"
              style={{
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-settings-desc, #6b6b6b)",
              }}
            >
              Layer settings are coming soon for Synapse v3.
            </p>
          </div>

          {/* ══ CONFIG section ══ */}
          <V3SectionHeader
            id={SECTION_IDS.config}
            liveEditPath="settingsChrome.sectionHeaderBg"
            icon={
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d={svgSettingsPaths.p2c41aa80} fill="white" fillRule="evenodd" clipRule="evenodd" />
              </svg>
            }
            title="Config"
          />
          <div className="mb-[22px]">
            <p
              className="italic mb-4"
              style={{
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-settings-desc, #6b6b6b)",
              }}
            >
              Config settings are coming soon for Synapse v3.
            </p>
            <div className="mt-4">
              <V3SettingRow
                label="Default Tab Content"
                description="What will be written to the contents of a new tab."
                control={
                  <input
                    className="px-3 py-2 rounded-[6px] outline-none text-[14px] border border-solid"
                    style={{
                      width: 250,
                      height: 38,
                      background: "var(--v3-settings-field-bg, #2d2d2d)",
                      borderColor: "var(--v3-settings-field-border, #3d3d3c)",
                      color: "var(--v3-settings-control-text, #ffffff)",
                    }}
                    value={v3s.defaultTabContent ?? ""}
                    onChange={(e) => updateV3({ defaultTabContent: e.target.value })}
                    placeholder="Content..."
                  />
                }
              />
              <V3SettingRow
                label="Directories in sidebar"
                description="You can set extra directories to show up in the sidebar."
                control={
                  <div
                    className="border border-solid rounded-[7px] flex items-center px-3 cursor-not-allowed text-[12px]"
                    style={{
                      background: "var(--v3-shell-page-bg, #000000)",
                      borderColor: "var(--v3-settings-field-border, #262626)",
                      color: "var(--v3-settings-desc, #6b6b6b)",
                      height: 28,
                      width: 250,
                    }}
                  >
                    H:\project\editor-sidebar-scripts
                  </div>
                }
              />
            </div>
          </div>

          {/* Bottom spacer for scroll-spy to work on last sections */}
          <div style={{ height: 200 }} />
        </div>
      </div>

      {/* Left sidebar — scroll-linked section indicators */}
      <div
        className="absolute"
        style={{ left: 0, top: 43, width: 58, bottom: 0, borderBottomLeftRadius: 7 }}
      >
        {sidebarItems.map((item, idx) => {
          const isActive = activeSidebarItem === item.id;
          const topOffset = idx * 45;
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="absolute flex items-center justify-center transition-colors"
              data-v3-live={isActive ? "settingsChrome.sidebarActiveBg" : undefined}
              style={{
                left: 3,
                top: topOffset + 4,
                width: 51,
                height: 36,
                color: isActive ? "var(--v3-settings-label, #ffffff)" : sidebarIconColor,
                background: isActive
                  ? "var(--v3-settings-sidebar-active, #313131)"
                  : "transparent",
                borderRadius: 4,
              }}
              title={item.label}
            >
              {item.icon}
              {isActive && (
                <div
                  className="absolute left-0 top-[4px] bottom-[4px] rounded-r-[2px]"
                  style={{
                    width: 3,
                    background: "var(--v3-settings-sidebar-accent, #bdd3de)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
