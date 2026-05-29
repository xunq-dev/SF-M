import { useMemo } from "react";
import svgPaths from "../remake-assets/v3-svg-paths";
import { V3TopBar } from "./V3TopBar";
import { V3SectionHeader } from "./v3SettingsUi";
import type { V3Page } from "../v3PageTypes";
import { useV3Theme } from "../v3Theme";
import { v3ThemeInlineVars } from "../v3ThemeCss";

const PLUGINS_CUBE_STROKE = "#8f8d48";

interface V3PluginsPageProps {
  currentPage: V3Page;
  onNavigate: (page: V3Page) => void;
}

function PluginsCubeIcon({ size = 18 }: { size?: number }) {
  const h = (size * 27) / 108.5;
  return (
    <svg viewBox="0 0 108.5 27" width={size} height={h} fill="none" aria-hidden>
      <path
        d={svgPaths.cubeNav}
        stroke={PLUGINS_CUBE_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.1}
      />
    </svg>
  );
}

export function V3PluginsPage({ currentPage, onNavigate }: V3PluginsPageProps) {
  const theme = useV3Theme();
  const themeVars = useMemo(() => v3ThemeInlineVars(theme), [theme]);

  return (
    <div className="size-full relative" style={themeVars}>
      <V3TopBar currentPage={currentPage} onNavigate={onNavigate} />

      <div
        className="absolute left-0 right-0 bottom-0 flex min-h-0 flex-col items-center justify-center px-6"
        style={{
          top: 44,
          background: "var(--v3-shell-page-bg, #151515)",
          borderBottomRightRadius: 7,
        }}
      >
        <div className="flex w-full max-w-[360px] flex-col items-stretch gap-5">
          <V3SectionHeader
            icon={<PluginsCubeIcon size={16} />}
            title="Plugins"
          />

          <div
            className="flex flex-col items-center justify-center rounded-[4px] border border-solid py-10"
            style={{
              background: "var(--v3-settings-control-bg, #373737)",
              borderColor: "var(--v3-settings-control-border, #3d3d3c)",
              boxShadow: "0px 0px 9.2px 0px rgba(0,0,0,0.35)",
            }}
          >
            <p
              className="m-0 text-center uppercase tracking-[0.22em]"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--v3-scripthub-error-text, #cc6e6e)",
              }}
            >
              COMING SOON
            </p>
            <p
              className="mt-3 max-w-[260px] text-center"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: 1.45,
                color: "var(--v3-settings-desc, #7e7e7e)",
              }}
            >
              Plugin management is not available in this build yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
