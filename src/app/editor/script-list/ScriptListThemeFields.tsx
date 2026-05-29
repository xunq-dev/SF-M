import type { ScriptListThemeTokens } from "./ScriptListThemeTokens";

type ColorRowProps = {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
};

type ScriptListThemeFieldsProps = {
  tokens: ScriptListThemeTokens;
  onChange: (partial: Partial<ScriptListThemeTokens>) => void;
  ColorRow: (props: ColorRowProps) => React.ReactNode;
};

export function ScriptListThemeFields({
  tokens,
  onChange,
  ColorRow,
}: ScriptListThemeFieldsProps) {
  const row = (label: string, description: string, key: keyof ScriptListThemeTokens) => (
    <ColorRow
      key={key}
      label={label}
      description={description}
      value={tokens[key]}
      onChange={(v) => onChange({ [key]: v })}
    />
  );

  return (
    <>
      {row("Section header", "Collapsible section bar background.", "sectionHeaderBg")}
      {row("Section text", "Section title labels.", "sectionHeaderText")}
      {row("Section icons", "Chevron and folder strokes.", "sectionIcon")}
      {row("Search field", "Script search input background.", "searchBg")}
      {row("Search placeholder", "Search hint text colour.", "searchPlaceholder")}
      {row("Row text", "Script name color.", "rowText")}
      {row("Row muted", "Secondary script row text.", "rowMutedText")}
      {row("Row hover", "Hover highlight on script rows.", "rowHoverBg")}
    </>
  );
}
