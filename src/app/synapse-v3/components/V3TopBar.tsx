import { useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "@/branding";
import { useV3Theme, V3_DEFAULT_TOP_BAR_LOGO_PRESET } from "../v3Theme";
import { useV3LiveEdit } from "../V3LiveEditContext";
import TopBarBrandMark from "@/app/components/TopBarBrandMark";
import imgLogo from "../remake-assets/v3-logo.png";
import svgPaths from "../remake-assets/v3-svg-paths";
import type { V3Page } from "../v3PageTypes";
import { navIconTransform, navUnderlineSpan, V3_NAV_SLOTS, type V3NavSlotId } from "../v3NavIconLayout";
import { v3ThemeControlPaths } from "./V3ThemeControlIcon";

type Page = V3Page;

interface TopBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

/** Map in-shell page to nav slot for underline placement. */
const pageNavSlot: Record<Exclude<Page, "scriptHub">, V3NavSlotId> = {
  editor: "editor",
  settings: "settings",
  theme: "theme",
  plugins: "plugins",
};

const NAV_ICON_STROKE = "var(--v3-topbar-nav-icon, #ffffff)";

export function V3TopBar({ currentPage, onNavigate }: TopBarProps) {
  const navUnderline =
    currentPage === "scriptHub"
      ? null
      : navUnderlineSpan(V3_NAV_SLOTS[pageNavSlot[currentPage]].cx);
  const appWindow = getCurrentWindow();
  const v3Theme = useV3Theme();
  const { enabled: liveEditEnabled } = useV3LiveEdit();
  const preset = v3Theme.branding.topBarLogoPreset;
  const customLogo = v3Theme.branding.logoDataUrl;
  const useBuiltInV3Logo = !customLogo && preset === V3_DEFAULT_TOP_BAR_LOGO_PRESET;
  const logoSrc = useMemo(() => {
    if (customLogo) return customLogo;
    if (useBuiltInV3Logo) return imgLogo;
    return resolveTopBarLogoUrl({
      logoDataUrl: null,
      topBarLogoPreset: preset,
    });
  }, [customLogo, preset, useBuiltInV3Logo]);
  const branding = v3Theme.branding;
  const logoIconMark =
    branding.logoMode === "image" &&
    !customLogo &&
    !useBuiltInV3Logo &&
    isTopBarIconMarkPreset(preset);
  const textLogo = {
    text: branding.logoText,
    color: branding.logoTextColor,
    fontId: branding.logoTextFontId,
    sizePx: branding.logoTextSizePx,
    weight: branding.logoTextWeight,
    letterSpacing: branding.logoTextLetterSpacing,
  };

  return (
    <div 
      className="absolute left-0 w-full select-none z-10" 
      style={{ top: 0, height: 44, background: "var(--v3-topbar-bg, #212120)" }}
      data-tauri-drag-region
      data-v3-live="topBar.bg"
    >
      <div
        className="absolute pointer-events-none"
        style={
          branding.logoMode === "text"
            ? { left: 9, top: 10, width: 120, height: 24, display: "flex", alignItems: "center" }
            : logoIconMark
              ? { left: 9, top: 6, width: 32, height: 32 }
              : { left: 9, top: 8, width: 105, height: 26 }
        }
      >
        <TopBarBrandMark
          mode={branding.logoMode}
          imageSrc={logoSrc}
          iconMark={logoIconMark}
          textLogo={textLogo}
          alt="SYNAPSE"
        />
      </div>

      {/* Version text */}
      <p
        className="absolute not-italic text-white pointer-events-none"
        style={{
          left: 120,
          top: 6,
          fontSize: 11,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          lineHeight: "normal",
          whiteSpace: "nowrap",
        }}
      >
        Framework v1.0.0<br />BETA V3
      </p>

      {liveEditEnabled ? (
        <div
          className="absolute"
          style={{ left: 120, top: 6, width: 90, height: 32 }}
          data-v3-live="topBar.mutedText"
          aria-hidden
        />
      ) : null}

      {liveEditEnabled ? (
        <span
          className="absolute pointer-events-none rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{
            left: 120,
            top: 30,
            color: "var(--v3-accent-primary, #5ee85e)",
            background: "rgba(94, 232, 94, 0.12)",
            border: "1px solid rgba(94, 232, 94, 0.35)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          LIVE EDIT
        </span>
      ) : null}

      {/* Navigation icons */}
      <div className="absolute" style={{ left: "calc(50% - 54.25px)", top: 8, width: 108.5, height: 27 }}>
        <svg
          viewBox="0 0 108.5 27"
          width={108.5}
          height={27}
          fill="none"
          className="block"
        >
          {navUnderline ? (
            <path
              d={`M${navUnderline[0]} 26.5L${navUnderline[1]} 26.5`}
              stroke={NAV_ICON_STROKE}
              strokeLinecap="round"
              strokeWidth={1.1}
              data-v3-live="topBar.navActiveUnderline"
            />
          ) : null}
          <g transform={navIconTransform(V3_NAV_SLOTS.editor, currentPage === "editor")}>
            <path d={svgPaths.p295dcf18} stroke={NAV_ICON_STROKE} strokeLinecap="round" strokeWidth={1.1} />
          </g>
          <g transform={navIconTransform(V3_NAV_SLOTS.settings, currentPage === "settings")}>
            <path d={svgPaths.p27ec7db0} stroke={NAV_ICON_STROKE} strokeLinecap="round" strokeWidth={1.1} />
          </g>
          <g transform={navIconTransform(V3_NAV_SLOTS.theme, currentPage === "theme")}>
            {v3ThemeControlPaths.map((d) => (
              <path
                key={d.slice(0, 24)}
                d={d}
                fill={NAV_ICON_STROKE}
                fillRule="nonzero"
              />
            ))}
          </g>
          <g transform={navIconTransform(V3_NAV_SLOTS.plugins, currentPage === "plugins")}>
            <path
              d={svgPaths.cubeNav}
              stroke={currentPage === "plugins" ? "#a8a650" : "#54532A"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={currentPage === "plugins" ? 1.25 : 1.1}
              fill="none"
            />
          </g>

          <rect
            x={0} y={0} width={25} height={27}
            fill="rgba(0,0,0,0)"
            className="cursor-pointer"
            pointerEvents="all"
            data-v3-live="topBar.navIcon"
            onClick={() => onNavigate("editor")}
          />
          <rect
            x={25} y={0} width={30} height={27}
            fill="rgba(0,0,0,0)"
            className="cursor-pointer"
            pointerEvents="all"
            data-v3-live="topBar.navIcon"
            onClick={() => onNavigate("settings")}
          />
          <rect
            x={55} y={0} width={27} height={27}
            fill="rgba(0,0,0,0)"
            className="cursor-pointer"
            pointerEvents="all"
            data-v3-live="topBar.navIcon"
            onClick={() => onNavigate("theme")}
          />
          <rect
            x={82} y={0} width={26.5} height={27}
            fill="rgba(0,0,0,0)"
            className="cursor-pointer"
            pointerEvents="all"
            data-v3-live="topBar.navIcon"
            onClick={() => onNavigate("plugins")}
          />
        </svg>
      </div>

      {/* Window controls — widened to 130 so a single globe marker fits to the left of minimize / maximize / close. */}
      <div className="absolute" style={{ right: 0, top: 0, width: 130, height: 44 }}>
        {/* Globe — Script Hub (Potassium-style hub entry). */}
        <button
          type="button"
          className="absolute flex items-center justify-center rounded-full transition-colors hover:opacity-90"
          style={{
            right: 109,
            top: 10,
            width: 24,
            height: 24,
            background:
              currentPage === "scriptHub"
                ? "var(--v3-script-row-hover, rgba(255,255,255,0.08))"
                : "transparent",
          }}
          title="Script Hub"
          aria-label="Script Hub"
          aria-current={currentPage === "scriptHub" ? "page" : undefined}
          onClick={() => onNavigate("scriptHub")}
        >
          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden>
            <circle
              cx={8}
              cy={8}
              r={6.5}
              stroke={currentPage === "scriptHub" ? "var(--v3-topbar-text, #ffffff)" : "white"}
              strokeWidth={1.2}
            />
            <ellipse
              cx={8}
              cy={8}
              rx={3}
              ry={6.5}
              stroke={currentPage === "scriptHub" ? "var(--v3-topbar-text, #ffffff)" : "white"}
              strokeWidth={1.2}
            />
            <path
              d="M1.5 8 L14.5 8"
              stroke={currentPage === "scriptHub" ? "var(--v3-topbar-text, #ffffff)" : "white"}
              strokeWidth={1.2}
            />
          </svg>
        </button>

        {/* Minimize */}
        <p
          className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] not-italic text-[24px] text-white cursor-pointer hover:text-gray-300 select-none"
          style={{ right: 82, top: 0, width: 11, height: 7 }}
          onClick={() => void appWindow.minimize()}
        >
          _
        </p>

        {/* Maximize */}
        <div
          className="absolute cursor-pointer hover:opacity-80"
          style={{ right: 47, top: 19, width: 10, height: 10 }}
          onClick={() => void appWindow.toggleMaximize()}
        >
          <div className="absolute inset-[-5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 11">
              <path d={svgPaths.p175e1800} id="Icon" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
            </svg>
          </div>
        </div>

        {/* Close */}
        <div
          className="absolute cursor-pointer hover:opacity-80"
          style={{ right: 15, top: 19, width: 10, height: 10 }}
          onClick={() => void appWindow.close()}
        >
          <div className="-rotate-180 -scale-x-100 size-full">
            <div className="absolute inset-[-5%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 11">
                <path d={svgPaths.p3eb4e780} id="Selected line" stroke="white" strokeLinecap="round" strokeWidth={1.1} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
