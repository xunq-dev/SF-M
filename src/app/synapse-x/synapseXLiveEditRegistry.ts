import { createFlatLiveEditRegistry } from "@/app/liveEdit/flatLiveEditRegistry";
import type { ScriptListThemeTokens } from "@/app/editor/script-list/ScriptListThemeTokens";
import type { SynapseXTheme } from "./synapseXTheme";

const SX_COLOR_KEYS = {
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

const SX_SCRIPT_LIST_KEYS = {
  "scriptList.sectionHeaderBg": { label: "Script section header", format: "hex" as const },
  "scriptList.sectionHeaderText": { label: "Script section text", format: "hex" as const },
  "scriptList.sectionIcon": { label: "Script section icon", format: "hex" as const },
  "scriptList.searchBg": { label: "Script search field", format: "hex" as const },
  "scriptList.searchPlaceholder": { label: "Script search placeholder", format: "hex" as const },
  "scriptList.rowText": { label: "Script row text", format: "hex" as const },
  "scriptList.rowHoverBg": { label: "Script row hover", format: "hex" as const },
  "scriptList.rowMutedText": { label: "Script row muted", format: "hex" as const },
} as const;

export type SxLiveEditPath = keyof typeof SX_COLOR_KEYS | keyof typeof SX_SCRIPT_LIST_KEYS;

const flatLiveEdit = createFlatLiveEditRegistry<SynapseXTheme>(SX_COLOR_KEYS);

export const sxLiveEdit = {
  ...flatLiveEdit,
  registry: { ...SX_COLOR_KEYS, ...SX_SCRIPT_LIST_KEYS },
  isPath(path: string): path is SxLiveEditPath {
    return path in SX_COLOR_KEYS || path in SX_SCRIPT_LIST_KEYS;
  },
  getTargetMeta(path: string) {
    if (path in SX_SCRIPT_LIST_KEYS) {
      return SX_SCRIPT_LIST_KEYS[path as keyof typeof SX_SCRIPT_LIST_KEYS];
    }
    return flatLiveEdit.getTargetMeta(path);
  },
  getColorAtPath(theme: SynapseXTheme, path: string): string | null {
    if (path.startsWith("scriptList.")) {
      const field = path.slice("scriptList.".length) as keyof ScriptListThemeTokens;
      const value = theme.scriptList[field];
      return typeof value === "string" ? value : null;
    }
    return flatLiveEdit.getColorAtPath(theme, path);
  },
  patchColorAtPath(path: string, value: string): Partial<SynapseXTheme> | null {
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

export function getSxLiveEditPathFromElement(el: HTMLElement | SVGElement): string | null {
  const path = el.getAttribute("data-sx-live") ?? el.getAttribute("data-sx-live-fallback");
  if (!path || !sxLiveEdit.isPath(path)) return null;
  return path;
}
