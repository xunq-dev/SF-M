/** Blue live-edit toggle for theme panel manage rows. */
export function LiveEditToggleButton({
  enabled,
  onChange,
  className = "",
  compact = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Disable live edit" : "Enable live edit"}
      onClick={() => onChange(!enabled)}
      className={`cursor-pointer border border-solid font-sans transition-colors ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"} ${className}`}
      style={
        enabled
          ? {
              background: "#2563a8",
              borderColor: "#3b82d4",
              color: "#ffffff",
            }
          : {
              background: "transparent",
              borderColor: "#3b82d4",
              color: "#7eb8f0",
            }
      }
    >
      {enabled ? "LIVE EDIT ON" : "Live edit"}
    </button>
  );
}
