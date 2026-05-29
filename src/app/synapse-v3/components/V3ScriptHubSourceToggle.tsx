import type { V3ThemeState } from "../v3Theme";

export type HubSource = "scriptblox" | "synapse";

const SEGMENTS: { id: HubSource; label: string }[] = [
  { id: "scriptblox", label: "ScriptBlox" },
  { id: "synapse", label: "Synapse Script Hub" },
];

/** Resolved at render — defaults follow accent + top bar (not stored pill colours). */
export function resolveScriptHubSourceToggleStyle(theme: V3ThemeState) {
  if (theme.scriptHub.toggleCustomized) {
    return {
      activeText: theme.scriptHub.toggleActiveText,
      inactiveText: theme.scriptHub.toggleInactiveText,
      indicator: theme.scriptHub.toggleIndicator,
      divider: theme.scriptHub.toggleDivider,
    };
  }
  return {
    activeText: theme.topBar.text,
    inactiveText: theme.topBar.mutedText,
    indicator: theme.accent.primary,
    divider: theme.settingsChrome.controlBorder,
  };
}

type V3ScriptHubSourceToggleProps = {
  value: HubSource;
  onChange: (source: HubSource) => void;
  theme: V3ThemeState;
};

/** Underline tabs (same idea as top nav) — no filled blue pill. */
export function V3ScriptHubSourceToggle({ value, onChange, theme }: V3ScriptHubSourceToggleProps) {
  const style = resolveScriptHubSourceToggleStyle(theme);

  return (
    <div
      role="tablist"
      aria-label="Script hub source"
      className="flex gap-0.5 border-b border-solid"
      style={{ borderColor: style.divider }}
    >
      {SEGMENTS.map((seg) => {
        const active = value === seg.id;
        return (
          <button
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.id)}
            className="min-w-0 flex-1 px-2 pb-2 pt-1.5 text-[11px] font-medium transition-colors"
            data-v3-live={active ? "scriptHub.toggleActiveText" : "scriptHub.toggleInactiveText"}
            style={{
              fontFamily: "Inter, sans-serif",
              color: active ? style.activeText : style.inactiveText,
              background: "transparent",
              border: "none",
              borderBottom: active ? `2px solid ${style.indicator}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
