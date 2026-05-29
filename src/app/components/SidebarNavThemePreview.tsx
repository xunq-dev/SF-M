import type { ShellThemeState } from "@/ui/shellTheme";
import {
  SIDEBAR_NAV_CELL_H,
  sidebarNavActivePillPath,
  sidebarNavPillBox,
  sidebarNavRoundedRectPath,
} from "@/ui/sidebarNavShape";

const PREVIEW_ROWS = 3;
const ACTIVE_ROW = 1;

/** Scaled mock of the left rail: three stacked cells, middle “selected”. */
export default function SidebarNavThemePreview({ theme }: { theme: ShellThemeState }) {
  const rowStepPx = SIDEBAR_NAV_CELL_H + theme.sidebarNavCellGapPx;
  const box = sidebarNavPillBox(
    theme.sidebarNavPillInsetHorizontalPx,
    theme.sidebarNavPillInsetVerticalPx,
  );
  const rx = theme.sidebarNavButtonRadiusPx;
  const spread = theme.sidebarNavNotchSpreadPx;
  const sw = theme.sidebarNavIconStrokeWidthPx;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-center text-[9px] text-[#888]">Live preview</p>
      <svg
        viewBox={`0 0 60 ${rowStepPx * PREVIEW_ROWS}`}
        className="h-[min(220px,42vh)] w-[72px] shrink-0 rounded-md border border-[#5a5a5a] shadow-inner"
        style={{ backgroundColor: theme.sidebarBg }}
        aria-hidden
      >
        {Array.from({ length: PREVIEW_ROWS }, (_, row) => {
          const isActive = row === ACTIVE_ROW;
          const nt = row > 0 ? theme.sidebarNavNotchTopPx : 0;
          const nb = row < PREVIEW_ROWS - 1 ? theme.sidebarNavNotchBottomPx : 0;
          const fill = isActive ? theme.sidebarNavActiveBg : theme.sidebarBg;
          const strokeCol = isActive
            ? theme.sidebarIconStrokeActive
            : theme.sidebarIconStrokeInactive;
          let d = "";
          if (rx > 0) {
            if (isActive) {
              d = sidebarNavActivePillPath(
                box.x,
                box.y,
                box.w,
                box.h,
                rx,
                nt,
                nb,
                spread,
                spread,
                theme.sidebarNavTrailingNotchPx,
                theme.sidebarNavTrailingNotchSpanPx,
              );
            } else {
              d = sidebarNavRoundedRectPath(box.x, box.y, box.w, box.h, rx);
            }
          }
          return (
            <g key={row} transform={`translate(0,${row * rowStepPx})`}>
              {rx <= 0 ? (
                <rect width="60" height="64" fill={fill} opacity={isActive ? 1 : 0.92} />
              ) : (
                <path d={d} fill={fill} />
              )}
              <circle
                cx="30"
                cy="32"
                r="7"
                fill="none"
                stroke={strokeCol}
                strokeWidth={sw}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
