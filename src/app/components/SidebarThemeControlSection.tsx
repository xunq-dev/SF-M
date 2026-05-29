import SidebarNavThemePreview from "./SidebarNavThemePreview";
import { Slider } from "./ui/slider";
import {
  resetShellThemeSidebarControl,
  writeShellTheme,
  SIDEBAR_NAV_BUTTON_RADIUS_MAX_PX,
  SIDEBAR_NAV_NOTCH_MAX_PX,
  SIDEBAR_NAV_NOTCH_SPREAD_MAX_PX,
  SIDEBAR_NAV_TRAILING_NOTCH_MAX_PX,
  SIDEBAR_NAV_TRAILING_SPAN_MAX_PX,
  SIDEBAR_NAV_PILL_INSET_H_MAX_PX,
  SIDEBAR_NAV_PILL_INSET_V_MAX_PX,
  SIDEBAR_NAV_ICON_STROKE_WIDTH_MAX,
  SIDEBAR_NAV_CELL_GAP_MAX_PX,
  type ShellThemeState,
} from "@/ui/shellTheme";

const linkBtn =
  "text-left text-[10px] text-[#9ec0ff] underline decoration-[#5a7ab8] underline-offset-2 hover:text-white";

const sliderClass =
  "w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-[#4a4a4a] [&_[data-slot=slider-range]]:bg-[#3149E8]";

type Props = {
  theme: ShellThemeState;
  sync: () => void;
};

export default function SidebarThemeControlSection({ theme, sync }: Props) {
  const apply = (partial: Partial<ShellThemeState>) => {
    writeShellTheme(partial);
    sync();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0 space-y-5">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#8a8a8a]">
            Quick looks
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-[#555] bg-[#353535] px-2.5 py-1.5 text-[10px] text-white hover:bg-[#404040]"
              onClick={() =>
                apply({
                  sidebarNavButtonRadiusPx: 0,
                  sidebarNavNotchTopPx: 0,
                  sidebarNavNotchBottomPx: 0,
                  sidebarNavNotchSpreadPx: 8,
                  sidebarNavTrailingNotchPx: 0,
                  sidebarNavTrailingNotchSpanPx: 0,
                  sidebarNavPillInsetHorizontalPx: 6,
                  sidebarNavPillInsetVerticalPx: 4,
                })
              }
            >
              Legacy flat cells
            </button>
            <button
              type="button"
              className="rounded border border-[#555] bg-[#353535] px-2.5 py-1.5 text-[10px] text-white hover:bg-[#404040]"
              onClick={() =>
                apply({
                  sidebarNavButtonRadiusPx: 12,
                  sidebarNavNotchTopPx: 0,
                  sidebarNavNotchBottomPx: 0,
                  sidebarNavNotchSpreadPx: 10,
                  sidebarNavTrailingNotchPx: 0,
                  sidebarNavTrailingNotchSpanPx: 0,
                })
              }
            >
              Rounded pills
            </button>
            <button
              type="button"
              className="rounded border border-[#555] bg-[#353535] px-2.5 py-1.5 text-[10px] text-white hover:bg-[#404040]"
              onClick={() =>
                apply({
                  sidebarNavButtonRadiusPx: 12,
                  sidebarNavNotchTopPx: 8,
                  sidebarNavNotchBottomPx: 8,
                  sidebarNavNotchSpreadPx: 12,
                  sidebarNavTrailingNotchPx: 6,
                  sidebarNavTrailingNotchSpanPx: 10,
                })
              }
            >
              Notched selection
            </button>
            <button
              type="button"
              className="rounded border border-[#555] bg-[#353535] px-2.5 py-1.5 text-[10px] text-white hover:bg-[#404040]"
              onClick={() =>
                apply({
                  sidebarNavButtonRadiusPx: 12,
                  sidebarNavNotchTopPx: 8,
                  sidebarNavNotchBottomPx: 8,
                  sidebarNavNotchSpreadPx: 12,
                  sidebarNavTrailingNotchPx: 0,
                  sidebarNavTrailingNotchSpanPx: 0,
                })
              }
            >
              Stack joints only
            </button>
            <button
              type="button"
              className="rounded border border-[#555] bg-[#353535] px-2.5 py-1.5 text-[10px] text-white hover:bg-[#404040]"
              onClick={() =>
                apply({
                  sidebarIconStrokeInactive: "#c4b5fd",
                  sidebarIconStrokeActive: "#f5f3ff",
                  sidebarIconStrokeHover: "#ddd6fe",
                })
              }
            >
              Lavender icons
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2" data-shell-text-no-step>
          <div className="rounded-md border border-[#3f3f3f] bg-[#252525]/90 p-3">
            <p className="mb-2 text-[10px] font-medium text-[#b0b0b0]">Pill shape</p>
            <Field
              label="Corner radius"
              hint="0 = full-width tiles. Use 10–14 for rounded pills."
              value={theme.sidebarNavButtonRadiusPx}
              min={0}
              max={SIDEBAR_NAV_BUTTON_RADIUS_MAX_PX}
              onChange={(px) => apply({ sidebarNavButtonRadiusPx: px })}
            />
            <div className="mt-3">
              <Field
                label="Horizontal inset"
                hint="Narrower or wider pills inside the 60px rail."
                value={theme.sidebarNavPillInsetHorizontalPx}
                min={2}
                max={SIDEBAR_NAV_PILL_INSET_H_MAX_PX}
                onChange={(px) => apply({ sidebarNavPillInsetHorizontalPx: px })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Vertical inset"
                hint="Padding above/below each glyph area."
                value={theme.sidebarNavPillInsetVerticalPx}
                min={2}
                max={SIDEBAR_NAV_PILL_INSET_V_MAX_PX}
                onChange={(px) => apply({ sidebarNavPillInsetVerticalPx: px })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Vertical gap between rows"
                hint="Extra space between stacked 64px nav cells (tooltip tracks with each row)."
                value={theme.sidebarNavCellGapPx}
                min={0}
                max={SIDEBAR_NAV_CELL_GAP_MAX_PX}
                onChange={(px) => apply({ sidebarNavCellGapPx: px })}
              />
            </div>
          </div>

          <div className="rounded-md border border-[#3f3f3f] bg-[#252525]/90 p-3">
            <p className="mb-2 text-[10px] font-medium text-[#b0b0b0]">Notch & curves</p>
            <p className="mb-3 text-[9px] leading-snug text-[#888]">
              <span className="text-[#9a9a9a]">Horizontal row joints:</span> top/bottom depth and
              curve spread shape the transition between stacked icons.
              <span className="mt-1 block text-[#9a9a9a]">Content-side edge:</span> right-edge depth
              and span scoop the active pill where it meets the page (optional).
            </p>
            <Field
              label="Top scoop depth"
              hint="Joint with the item above (0 = none)."
              value={theme.sidebarNavNotchTopPx}
              min={0}
              max={SIDEBAR_NAV_NOTCH_MAX_PX}
              onChange={(px) => apply({ sidebarNavNotchTopPx: px })}
            />
            <div className="mt-3">
              <Field
                label="Bottom scoop depth"
                hint="Joint with the item below."
                value={theme.sidebarNavNotchBottomPx}
                min={0}
                max={SIDEBAR_NAV_NOTCH_MAX_PX}
                onChange={(px) => apply({ sidebarNavNotchBottomPx: px })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Curve spread (top/bottom)"
                hint="Wider transitions = gentler arcs between rows."
                value={theme.sidebarNavNotchSpreadPx}
                min={0}
                max={SIDEBAR_NAV_NOTCH_SPREAD_MAX_PX}
                onChange={(px) => apply({ sidebarNavNotchSpreadPx: px })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Right-edge depth"
                hint="How far the active outline indents toward the content (0 = straight vertical edge)."
                value={theme.sidebarNavTrailingNotchPx}
                min={0}
                max={SIDEBAR_NAV_TRAILING_NOTCH_MAX_PX}
                onChange={(px) => apply({ sidebarNavTrailingNotchPx: px })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Right-edge span"
                hint="Vertical length of each right-edge scoop (path clamps to the cell)."
                value={theme.sidebarNavTrailingNotchSpanPx}
                min={0}
                max={SIDEBAR_NAV_TRAILING_SPAN_MAX_PX}
                onChange={(px) => apply({ sidebarNavTrailingNotchSpanPx: px })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#3f3f3f] bg-[#252525]/90 p-3">
          <p className="mb-2 text-[10px] font-medium text-[#b0b0b0]">Icons</p>
          <div className="mb-3 max-w-md">
            <p className="mb-1 text-[9px] text-[#888]">Stroke width</p>
            <Slider
              className={sliderClass}
              value={[theme.sidebarNavIconStrokeWidthPx]}
              min={1}
              max={SIDEBAR_NAV_ICON_STROKE_WIDTH_MAX}
              step={0.5}
              onValueChange={(v) => {
                const n = Math.round((v[0] ?? 2) * 2) / 2;
                apply({
                  sidebarNavIconStrokeWidthPx: Math.min(
                    SIDEBAR_NAV_ICON_STROKE_WIDTH_MAX,
                    Math.max(1, n),
                  ),
                });
              }}
            />
            <p className="mt-1 text-[9px] text-[#888]">{theme.sidebarNavIconStrokeWidthPx}px</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["Inactive", "sidebarIconStrokeInactive", theme.sidebarIconStrokeInactive],
                ["Active", "sidebarIconStrokeActive", theme.sidebarIconStrokeActive],
                ["Hover", "sidebarIconStrokeHover", theme.sidebarIconStrokeHover],
              ] as const
            ).map(([label, key, val]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] text-[#b0b0b0]">{label}</span>
                <input
                  type="color"
                  value={val}
                  onChange={(e) => apply({ [key]: e.target.value } as Partial<ShellThemeState>)}
                  className="h-8 w-10 cursor-pointer overflow-hidden rounded-sm border border-[#555] bg-[#4a4a4a] p-0"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={linkBtn}
          onClick={() => {
            resetShellThemeSidebarControl();
            sync();
          }}
        >
          Back to default (sidebar control)
        </button>
      </div>

      <div className="flex justify-center lg:sticky lg:top-4 lg:justify-end">
        <SidebarNavThemePreview theme={theme} />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (px: number) => void;
}) {
  return (
    <div>
      <p className="mb-0.5 text-[9px] font-medium text-[#a8a8a8]">{label}</p>
      <p className="mb-1.5 text-[8px] leading-snug text-[#777]">{hint}</p>
      <Slider
        className={sliderClass}
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => {
          const px = Math.round(v[0] ?? min);
          onChange(Math.min(max, Math.max(min, px)));
        }}
      />
      <p className="mt-1 text-[9px] text-[#888]">{value}px</p>
    </div>
  );
}
