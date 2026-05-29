import { useEffect, useMemo, useState } from "react";
import {
  EDITOR_THEME_CHANGED_EVENT,
  filterPublicMonacoThemeOptions,
  writeShellEditorMonacoTheme,
  type EditorMonacoThemeShellField,
} from "@/editor/editorThemes";
import { readShellTheme, SHELL_THEME_CHANGED_EVENT } from "@/ui/shellTheme";

type Props = {
  field: EditorMonacoThemeShellField;
  /** Optional label shown above the select (native panels). */
  label?: string;
  description?: string;
  className?: string;
  selectClassName?: string;
};

export default function EditorMonacoThemeDropdown({
  field,
  label = "Syntax theme",
  description = "Monaco syntax highlighting for the script editor.",
  className,
  selectClassName,
}: Props) {
  const [themeId, setThemeId] = useState(() => readShellTheme()[field]);

  useEffect(() => {
    const sync = () => setThemeId(readShellTheme()[field]);
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
      window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [field]);

  const options = useMemo(() => filterPublicMonacoThemeOptions(themeId), [themeId]);

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5">
          <p className="font-sans text-[12px] text-white">{label}</p>
          {description ? (
            <p className="font-sans text-[11px] leading-snug text-[#a3a3a3]">{description}</p>
          ) : null}
        </div>
      ) : null}
      <select
        className={
          selectClassName ??
          "h-[33px] w-full cursor-pointer border border-solid border-[#2a2a2a] bg-[#2d2d2d] px-2 font-sans text-[12px] text-white outline-none"
        }
        value={themeId}
        aria-label={label}
        onChange={(e) => {
          const id = e.target.value;
          setThemeId(id);
          writeShellEditorMonacoTheme(field, id);
        }}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
