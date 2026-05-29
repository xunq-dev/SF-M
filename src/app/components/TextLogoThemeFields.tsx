import { UI_FONT_OPTIONS } from "@/ui/shellTheme";

type TextLogoFieldsProps = {
  mode: "image" | "text";
  onModeChange: (mode: "image" | "text") => void;
  /** Used when the field would otherwise be blank (all UIs keep a visible label). */
  fallbackText: string;
  text: string;
  onTextChange: (text: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  fontId: string;
  onFontIdChange: (fontId: string) => void;
  sizePx: number;
  onSizePxChange: (size: number) => void;
  weight: number;
  onWeightChange: (weight: number) => void;
  letterSpacing: number;
  onLetterSpacingChange: (spacing: number) => void;
  compact?: boolean;
};

export function TextLogoThemeFields({
  mode,
  onModeChange,
  fallbackText,
  text,
  onTextChange,
  color,
  onColorChange,
  fontId,
  onFontIdChange,
  sizePx,
  onSizePxChange,
  weight,
  onWeightChange,
  letterSpacing,
  onLetterSpacingChange,
  compact = false,
}: TextLogoFieldsProps) {
  const labelClass = compact
    ? "text-[11px] text-[#a3a3a3]"
    : "text-[12px]";
  const labelStyle = compact ? undefined : { color: "var(--v3-settings-desc, #6b6b6b)" };

  return (
    <div className={compact ? "mt-2 space-y-2" : "mb-4 space-y-3"}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={labelClass} style={labelStyle}>Logo type</span>
        <label className="flex items-center gap-1.5 text-[12px] text-white cursor-pointer">
          <input
            type="radio"
            name="logo-mode"
            checked={mode === "image"}
            onChange={() => onModeChange("image")}
          />
          Image
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-white cursor-pointer">
          <input
            type="radio"
            name="logo-mode"
            checked={mode === "text"}
            onChange={() => onModeChange("text")}
          />
          Text
        </label>
      </div>
      {mode === "text" ? (
        <>
          <div className="flex flex-col gap-1 max-w-[320px]">
            <span className={labelClass} style={labelStyle}>Logo text</span>
            <input
              type="text"
              value={text}
              onChange={(e) => {
                const v = e.target.value;
                if (v.trim() === "") {
                  onTextChange(fallbackText);
                  return;
                }
                onTextChange(v);
              }}
              onBlur={(e) => {
                if (!e.target.value.trim()) onTextChange(fallbackText);
              }}
              className="h-[28px] rounded border border-solid px-2 text-[12px] text-white"
              style={
                compact
                  ? { background: "#2d2d2d", borderColor: "#2a2a2a" }
                  : {
                      background: "var(--v3-editor-tab-inactive)",
                      borderColor: "var(--v3-editor-tab-border)",
                    }
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelClass} style={labelStyle}>Color</span>
            <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} />
            <span className="font-mono text-[11px] text-[#a3a3a3]">{color}</span>
          </div>
          <div className="flex flex-col gap-1 max-w-[320px]">
            <span className={labelClass} style={labelStyle}>Font</span>
            <select
              value={fontId}
              onChange={(e) => onFontIdChange(e.target.value)}
              className="h-[28px] rounded border border-solid px-2 text-[12px] text-white"
              style={
                compact
                  ? { background: "#2d2d2d", borderColor: "#2a2a2a" }
                  : {
                      background: "var(--v3-editor-tab-inactive)",
                      borderColor: "var(--v3-editor-tab-border)",
                    }
              }
            >
              {UI_FONT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[#a3a3a3] max-w-[320px]">
            Size {sizePx}px
            <input
              type="range"
              min={8}
              max={32}
              value={sizePx}
              onChange={(e) => onSizePxChange(Number(e.target.value))}
              className="flex-1 accent-[#5a9fd4]"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[#a3a3a3] max-w-[320px]">
            Weight {weight}
            <input
              type="range"
              min={300}
              max={900}
              step={100}
              value={weight}
              onChange={(e) => onWeightChange(Number(e.target.value))}
              className="flex-1 accent-[#5a9fd4]"
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[#a3a3a3] max-w-[320px]">
            Tracking {letterSpacing}px
            <input
              type="range"
              min={-2}
              max={8}
              value={letterSpacing}
              onChange={(e) => onLetterSpacingChange(Number(e.target.value))}
              className="flex-1 accent-[#5a9fd4]"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
