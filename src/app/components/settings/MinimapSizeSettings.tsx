import { Slider } from "@/app/components/ui/slider";
import {
  clampMinimapScale,
  DEFAULT_MINIMAP_SCALE,
  MINIMAP_SCALE_MAX,
  MINIMAP_SCALE_MIN,
} from "@/app/appSettings";
import { V3SettingRow, V3SliderRow } from "@/app/synapse-v3/components/v3SettingsUi";
import { ShellFitBlock } from "@/app/components/ShellFitBlock";
import { ShellFitLine } from "@/app/components/ShellFitLine";

const SHELL_SLIDER_CLASS =
  "w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-[color:var(--tp-slider-track)] [&_[data-slot=slider-range]]:bg-[color:var(--tp-slider-range)]";

type MinimapSizeProps = {
  enabled: boolean;
  scale: number;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
};

function formatScale(scale: number): string {
  return `${clampMinimapScale(scale)}×`;
}

/** Synapse V3 settings — slider + reset below the minimap toggle. */
export function MinimapSizeSettingsV3({
  enabled,
  scale,
  onScaleChange,
  onReset,
}: MinimapSizeProps): JSX.Element | null {
  if (!enabled) return null;
  const value = clampMinimapScale(scale);
  const isDefault = value === DEFAULT_MINIMAP_SCALE;
  return (
    <>
      <V3SliderRow
        label="Minimap size"
        description="Scale of the minimap preview (1× is default)."
        value={value}
        min={MINIMAP_SCALE_MIN}
        max={MINIMAP_SCALE_MAX}
        formatValue={formatScale}
        onChange={(v) => onScaleChange(clampMinimapScale(v))}
      />
      <V3SettingRow
        label="Minimap size default"
        description="Restore the minimap scale to 1×."
        control={
          <button
            type="button"
            disabled={isDefault}
            onClick={onReset}
            className="text-left text-[12px] underline underline-offset-2 hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: "var(--v3-accent-muted, #b0d8e5)" }}
          >
            Reset to default
          </button>
        }
      />
    </>
  );
}

/** Synapse Blue (default shell) settings. */
export function MinimapSizeSettingsShell({
  enabled,
  scale,
  onScaleChange,
  onReset,
}: MinimapSizeProps): JSX.Element | null {
  if (!enabled) return null;
  const value = clampMinimapScale(scale);
  const isDefault = value === DEFAULT_MINIMAP_SCALE;
  return (
    <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
          <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
            Minimap size
          </ShellFitLine>
        </p>
        <span className="shrink-0 font-mono text-[11px] text-[color:var(--tp-section-title)]">
          {formatScale(value)}
        </span>
      </div>
      <p className="mb-2 min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
        <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
          Scale of the minimap preview (1× is default).
        </ShellFitBlock>
      </p>
      <Slider
        className={SHELL_SLIDER_CLASS}
        value={[value]}
        min={MINIMAP_SCALE_MIN}
        max={MINIMAP_SCALE_MAX}
        step={1}
        onValueChange={(v) => onScaleChange(clampMinimapScale(v[0] ?? DEFAULT_MINIMAP_SCALE))}
        aria-label="Minimap size"
      />
      <button
        type="button"
        disabled={isDefault}
        onClick={onReset}
        className="mt-2 text-[10px] underline underline-offset-2 text-[color:var(--tp-section-title)] hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset to default
      </button>
    </section>
  );
}

type OgStyleProps = MinimapSizeProps & {
  rowBg: string;
  rowBorder: string;
  chipBg: string;
  chipBorder: string;
};

function OgStyleMinimapSizeRow({
  enabled,
  scale,
  onScaleChange,
  onReset,
  rowBg,
  rowBorder,
  chipBg,
  chipBorder,
}: OgStyleProps): JSX.Element | null {
  if (!enabled) return null;
  const value = clampMinimapScale(scale);
  const isDefault = value === DEFAULT_MINIMAP_SCALE;
  return (
    <div
      className="flex min-h-[60px] w-full shrink-0 flex-col justify-center gap-2 border border-solid px-3 py-2"
      style={{ backgroundColor: rowBg, borderColor: rowBorder }}
    >
      <div className="flex w-full flex-row items-center gap-3">
        <div
          className="flex h-[33px] w-[120px] shrink-0 items-center justify-center border border-solid"
          style={{ backgroundColor: chipBg, borderColor: chipBorder }}
        >
          <span className="text-center font-sans text-[13px] leading-none text-white">Minimap size</span>
        </div>
        <p className="min-w-0 flex-1 font-sans text-[12px] leading-snug text-[#a3a3a3]">
          Scale of the minimap preview (1× is default).
        </p>
        <span className="shrink-0 font-mono text-[12px] text-white">{formatScale(value)}</span>
      </div>
      <div className="flex w-full flex-row items-center gap-3 pl-[132px]">
        <input
          type="range"
          min={MINIMAP_SCALE_MIN}
          max={MINIMAP_SCALE_MAX}
          step={1}
          value={value}
          onChange={(e) => onScaleChange(clampMinimapScale(Number(e.target.value)))}
          className="min-w-0 flex-1 accent-[#5a9fd4]"
          aria-label="Minimap size"
        />
        <button
          type="button"
          disabled={isDefault}
          onClick={onReset}
          className="shrink-0 cursor-pointer border-0 bg-transparent font-sans text-[11px] text-[#b0d8e5] underline underline-offset-2 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset to default
        </button>
      </div>
    </div>
  );
}

/** Synapse 2017 (OG) options window. */
export function MinimapSizeSettingsSynapseOriginal(props: MinimapSizeProps): JSX.Element | null {
  return (
    <OgStyleMinimapSizeRow
      {...props}
      rowBg="#282827"
      rowBorder="#313131"
      chipBg="#272727"
      chipBorder="#323232"
    />
  );
}

/** Synapse X options window. */
export function MinimapSizeSettingsSynapseX(props: MinimapSizeProps): JSX.Element | null {
  return (
    <OgStyleMinimapSizeRow
      {...props}
      rowBg="var(--sx-panel-bg, #3C3C3C)"
      rowBorder="#484848"
      chipBg="#333333"
      chipBorder="#484848"
    />
  );
}
