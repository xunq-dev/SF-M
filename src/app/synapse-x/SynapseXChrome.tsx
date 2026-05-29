import type { ReactNode } from "react";
import { useSynapseXTheme } from "@/app/synapse-x/synapseXTheme";
import { useSynapseXLiveEdit } from "@/app/synapse-x/SynapseXLiveEditContext";
import { dblClickMaximizeIfResizable } from "@/app/windowConstraints";
import { resolveTopBarLogoUrl } from "@/ui/topBarLogos";
import TopBarBrandMark from "@/app/components/TopBarBrandMark";

type ChromeVariant = "loader" | "main" | "scriptHub" | "options" | "console";

type Props = {
  title: string;
  /** Optional trailing status on the same centered line as `title` (e.g. attach banner). */
  titleStatus?: ReactNode;
  variant: ChromeVariant;
  children: ReactNode;
  onMinimize?: () => void;
  onClose?: () => void;
};

/**
 * Title strip matching WPF `#3C3C3C` chrome; drag region for undecorated Tauri windows.
 * Reads colours from `--sx-*` CSS variables (driven by `synapseXTheme`) and the custom
 * logo from theme storage when the user has uploaded one.
 */
export default function SynapseXChrome({
  title,
  titleStatus,
  variant,
  children,
  onMinimize,
  onClose,
}: Props) {
  const theme = useSynapseXTheme();
  const { enabled: liveEditEnabled } = useSynapseXLiveEdit();
  const headerH = variant === "loader" ? "h-[37px]" : "h-[30px]";
  const headerStyle = { backgroundColor: "var(--sx-panel-bg, #3C3C3C)" } as const;
  const buttonClass =
    "flex h-[30px] w-[22px] items-center justify-center bg-transparent text-[13px] hover:bg-white/10";
  const showMinimize = variant === "main" || variant === "scriptHub" || variant === "console";
  const showClose =
    (variant === "main" || (variant === "options" && onClose) || variant === "console") && Boolean(onClose);
  const logoSrc = resolveTopBarLogoUrl({ logoDataUrl: theme.logoDataUrl, topBarLogoPreset: theme.logoPreset });
  const textLogo = {
    text: theme.logoText,
    color: theme.logoTextColor,
    fontId: theme.logoTextFontId,
    sizePx: theme.logoTextSizePx,
    weight: theme.logoTextWeight,
    letterSpacing: theme.logoTextLetterSpacing,
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        backgroundColor: "var(--sx-window-bg, #333333)",
        color: "var(--sx-text, #ffffff)",
      }}
      data-sx-live-fallback="windowBg"
    >
      <header
        data-tauri-drag-region
        className={`relative flex shrink-0 items-center ${headerH}`}
        style={headerStyle}
        data-sx-live="panelBg"
        onDoubleClick={() => void dblClickMaximizeIfResizable()}
      >
        <div
          className={`pointer-events-none absolute left-2 top-1/2 max-w-[120px] -translate-y-1/2 ${
            variant === "loader" ? "max-h-[26px]" : "max-h-[22px]"
          }`}
        >
          <TopBarBrandMark
            mode={theme.logoMode}
            imageSrc={logoSrc}
            textLogo={textLogo}
            alt=""
            className="max-h-[22px] w-auto object-contain object-left"
          />
        </div>
        {liveEditEnabled ? (
          <span
            className="pointer-events-none absolute left-[88px] top-1/2 z-[2] -translate-y-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
            style={{ background: "#2563a8", color: "#fff" }}
          >
            LIVE EDIT
          </span>
        ) : null}
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-[1] flex h-full select-none items-center justify-center px-14 text-center text-[13px] leading-tight"
        >
          <p
            data-tauri-drag-region
            className="max-w-full select-none truncate pb-[1px]"
            style={{ color: "var(--sx-text, #ffffff)" }}
            data-sx-live="text"
          >
            <span>{title}</span>
            {titleStatus != null ? (
              <span className="font-normal text-[#c0c0c0]"> {titleStatus}</span>
            ) : null}
          </p>
        </div>
        {(showMinimize || showClose) && (
          <div className="absolute right-0 top-0 z-10 flex h-full">
            {showMinimize ? (
              <button
                type="button"
                aria-label="Minimize"
                className={buttonClass}
                style={{ color: "var(--sx-text, #ffffff)" }}
                data-sx-live="buttonText"
                onClick={onMinimize}
              >
                <span data-sx-live="iconColor" aria-hidden>_</span>
              </button>
            ) : null}
            {showClose ? (
              <button
                type="button"
                aria-label="Close"
                className={buttonClass}
                style={{ color: "var(--sx-text, #ffffff)" }}
                data-sx-live="buttonText"
                onClick={onClose}
              >
                <span data-sx-live="iconColor" aria-hidden>X</span>
              </button>
            ) : null}
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
