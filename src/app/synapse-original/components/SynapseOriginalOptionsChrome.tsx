import type { ReactNode } from "react";
import synapseLogo from "@/assets/synapse-original/synapse-logo.png?url";
import { useOgLiveEdit } from "@/app/synapse-original/OgLiveEditContext";
import { useOgTheme } from "@/app/synapse-original/ogTheme";
import { dblClickMaximizeIfResizable } from "@/app/windowConstraints";
import { resolveTopBarLogoUrl } from "@/ui/topBarLogos";
import TopBarBrandMark from "@/app/components/TopBarBrandMark";

type Props = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
};

/**
 * OG settings/options title strip — drag region for undecorated Tauri windows.
 * Uses `--og-*` CSS variables and the persisted OG theme logo.
 */
export default function SynapseOriginalOptionsChrome({ title, children, onClose }: Props) {
  const theme = useOgTheme();
  const { enabled: liveEditEnabled } = useOgLiveEdit();
  const logoSrc = theme.logoDataUrl ?? resolveTopBarLogoUrl({ topBarLogoPreset: theme.logoPreset }) ?? synapseLogo;
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
        backgroundColor: "var(--og-window-bg, #232323)",
        color: "var(--og-text, #ffffff)",
      }}
    >
      <header
        data-tauri-drag-region
        className="relative flex h-[58px] shrink-0 items-center"
        style={{ backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-og-live="panelBg"
        onDoubleClick={() => void dblClickMaximizeIfResizable()}
      >
        <div className="pointer-events-none absolute left-2 top-1/2 max-h-[26px] max-w-[126px] -translate-y-1/2">
          <TopBarBrandMark
            mode={theme.logoMode}
            imageSrc={logoSrc}
            textLogo={textLogo}
            alt=""
            className="max-h-[26px] w-auto object-contain object-left"
          />
        </div>
        {liveEditEnabled ? (
          <span
            className="pointer-events-none absolute left-[100px] top-1/2 z-[2] -translate-y-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
            style={{ background: "#2563a8", color: "#fff" }}
          >
            LIVE EDIT
          </span>
        ) : null}
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-[1] flex h-full select-none items-center justify-center px-16 text-center text-[14px] leading-tight"
        >
          <p
            data-tauri-drag-region
            className="max-w-full select-none truncate"
            style={{ color: "var(--og-text, #ffffff)" }}
            data-og-live="text"
          >
            {title}
          </p>
        </div>
        {onClose ? (
          <div className="absolute right-0 top-0 z-10 flex h-full">
            <button
              type="button"
              aria-label="Close"
              className="flex h-[58px] w-[28px] items-center justify-center bg-transparent text-[13px] hover:bg-white/10"
              style={{ color: "var(--og-text, #ffffff)" }}
              onClick={onClose}
            >
              X
            </button>
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
