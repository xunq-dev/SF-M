import { createFlatLiveEditRegistry } from "@/app/liveEdit/flatLiveEditRegistry";
import type { OgTheme } from "./ogTheme";
import type { ScriptListThemeTokens } from "@/app/editor/script-list/ScriptListThemeTokens";

const OG_COLOR_KEYS = {
  windowBg: { label: "Window background", format: "hex" as const },
  panelBg: { label: "Panel background", format: "hex" as const },
  text: { label: "Title bar text", format: "hex" as const },
  buttonBg: { label: "Button background", format: "hex" as const },
  buttonHoverBg: { label: "Button hover", format: "hex" as const },
  buttonActiveBg: { label: "Button active", format: "hex" as const },
  buttonBorder: { label: "Button border", format: "hex" as const },
  buttonText: { label: "Button text", format: "hex" as const },
  tabBg: { label: "Tab background", format: "hex" as const },
  tabActiveBg: { label: "Active tab", format: "hex" as const },
  tabBorder: { label: "Tab border", format: "hex" as const },
  tabActiveBorder: { label: "Active tab border", format: "hex" as const },
  tabText: { label: "Tab text", format: "hex" as const },
  editorBg: { label: "Editor background", format: "hex" as const },
  listHoverBg: { label: "Script list hover", format: "hex" as const },
  listText: { label: "Script list text", format: "hex" as const },
  iconColor: { label: "Icon color", format: "hex" as const },
};

const OG_SCRIPT_LIST_KEYS = {
  "scriptList.sectionHeaderBg": { label: "Script section header", format: "hex" as const },
  "scriptList.sectionHeaderText": { label: "Script section text", format: "hex" as const },
  "scriptList.sectionIcon": { label: "Script section icon", format: "hex" as const },
  "scriptList.searchBg": { label: "Script search field", format: "hex" as const },
  "scriptList.searchPlaceholder": { label: "Script search placeholder", format: "hex" as const },
  "scriptList.rowText": { label: "Script row text", format: "hex" as const },
  "scriptList.rowHoverBg": { label: "Script row hover", format: "hex" as const },
  "scriptList.rowMutedText": { label: "Script row muted", format: "hex" as const },
} as const;

export type OgLiveEditPath = keyof typeof OG_COLOR_KEYS | keyof typeof OG_SCRIPT_LIST_KEYS;

const flatLiveEdit = createFlatLiveEditRegistry<OgTheme>(OG_COLOR_KEYS);

export const ogLiveEdit = {
  ...flatLiveEdit,
  registry: { ...OG_COLOR_KEYS, ...OG_SCRIPT_LIST_KEYS },
  isPath(path: string): path is OgLiveEditPath {
    return path in OG_COLOR_KEYS || path in OG_SCRIPT_LIST_KEYS;
  },
  getTargetMeta(path: string) {
    if (path in OG_SCRIPT_LIST_KEYS) {
      return OG_SCRIPT_LIST_KEYS[path as keyof typeof OG_SCRIPT_LIST_KEYS];
    }
    return flatLiveEdit.getTargetMeta(path);
  },
  getColorAtPath(theme: OgTheme, path: string): string | null {
    if (path.startsWith("scriptList.")) {
      const field = path.slice("scriptList.".length) as keyof ScriptListThemeTokens;
      const value = theme.scriptList[field];
      return typeof value === "string" ? value : null;
    }
    return flatLiveEdit.getColorAtPath(theme, path);
  },
  patchColorAtPath(path: string, value: string): Partial<OgTheme> | null {
    if (path.startsWith("scriptList.")) {
      const field = path.slice("scriptList.".length) as keyof ScriptListThemeTokens;
      const partial: Partial<ScriptListThemeTokens> = { [field]: value };
      if (field === "rowHoverBg") return { scriptList: partial, listHoverBg: value };
      if (field === "rowText") return { scriptList: partial, listText: value };
      return { scriptList: partial };
    }
    return flatLiveEdit.patchColorAtPath(path, value);
  },
};

export function getOgLiveEditPathFromElement(el: HTMLElement | SVGElement): string | null {
  const path = el.getAttribute("data-og-live") ?? el.getAttribute("data-og-live-fallback");
  if (!path || !ogLiveEdit.isPath(path)) return null;
  return path;
}
