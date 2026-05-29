import svgPaths from "@/imports/svg-bj8q31w0fn";
import type { ConfirmationDialogThemeState } from "@/ui/shellTheme";

type Props = {
  theme: ConfirmationDialogThemeState;
  mode: "current" | "all" | "tab";
};

/** Scaled static preview for Theme Control (no Tauri / emit). */
export default function ConfirmationDialogThemePreview({ theme, mode }: Props) {
  const title =
    mode === "current"
      ? theme.clearCurrentTitle
      : mode === "all"
        ? theme.closeAllTitle
        : theme.closeTabTitle;
  const line1 =
    mode === "current"
      ? theme.clearCurrentBodyLine1
      : mode === "all"
        ? theme.closeAllBodyLine1
        : theme.closeTabBodyLine1;
  const line2 =
    mode === "current"
      ? theme.clearCurrentBodyLine2
      : mode === "all"
        ? theme.closeAllBodyLine2
        : theme.closeTabBodyLine2;
  const topBar = `linear-gradient(to bottom, ${theme.topBarFrom}, ${theme.topBarTo})`;

  return (
    <div
      className="pointer-events-none origin-top-left scale-[0.42] overflow-hidden rounded border border-[#5a5a5a] shadow-inner"
      style={{
        width: theme.windowWidthPx,
        height: theme.windowHeightPx,
        backgroundColor: theme.panelBg,
      }}
    >
      <div className="h-[55px] w-full shadow-[0px_8px_15.9px_0px_rgba(0,0,0,0.15)]" style={{ background: topBar }} />
      <div className="flex flex-col items-center px-3 pt-2">
        <svg className="mb-1 h-8 w-8" fill="none" viewBox="0 0 36 36" aria-hidden>
          <path
            d={svgPaths.p1e4b3c80}
            stroke={theme.iconStroke}
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <p className="mb-1 text-center text-[21px] text-white" style={{ color: theme.titleColor }}>
          {title}
        </p>
        <div className="mb-3 max-w-[420px] text-center text-[14px]" style={{ color: theme.bodyColor }}>
          <p className="mb-0">{line1}</p>
          <p>{line2}</p>
        </div>
        <div className="flex gap-2">
          <div
            className="h-8 min-w-[80px] border text-[12px] leading-8"
            style={{
              borderColor: theme.noButtonBorder,
              color: theme.noButtonText,
              backgroundImage: `linear-gradient(to bottom, ${theme.noButtonFrom}, ${theme.noButtonTo})`,
            }}
          >
            No
          </div>
          <div
            className="h-8 min-w-[80px] border text-[12px] leading-8"
            style={{
              borderColor: theme.yesButtonBorder,
              color: theme.yesButtonText,
              backgroundImage: `linear-gradient(to bottom, ${theme.yesButtonFrom}, ${theme.yesButtonTo})`,
            }}
          >
            Yes
          </div>
        </div>
      </div>
    </div>
  );
}
