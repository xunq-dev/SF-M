import type { V3ThemeState } from "./v3Theme";

export type V3LiveEditColorFormat = "hex" | "rgba";

export type V3LiveEditPath = keyof typeof V3_LIVE_EDIT_REGISTRY;

export type V3LiveEditTargetMeta = {
  label: string;
  format: V3LiveEditColorFormat;
};
export const V3_LIVE_EDIT_REGISTRY = {
  "shell.windowBg": { label: "Window background", format: "hex" },
  "shell.pageBg": { label: "Page background", format: "hex" },
  "shell.contentBg": { label: "Content background", format: "hex" },
  "shell.shellBorder": { label: "Shell border", format: "hex" },
  "topBar.bg": { label: "Top bar background", format: "hex" },
  "topBar.text": { label: "Top bar text", format: "hex" },
  "topBar.mutedText": { label: "Top bar muted text", format: "hex" },
  "topBar.navIcon": { label: "Top bar nav icons", format: "hex" },
  "topBar.navActiveUnderline": { label: "Top bar active underline", format: "hex" },
  "editor.workAreaBg": { label: "Editor work area", format: "hex" },
  "editor.tabBarBg": { label: "Tab bar background", format: "hex" },
  "editor.tabInactiveBg": { label: "Inactive tab", format: "hex" },
  "editor.tabActiveBg": { label: "Active tab", format: "hex" },
  "editor.tabText": { label: "Tab text", format: "hex" },
  "editor.tabBorder": { label: "Tab border", format: "hex" },
  "scriptList.sectionHeaderBg": { label: "Script section header", format: "hex" },
  "scriptList.sectionHeaderText": { label: "Script section text", format: "hex" },
  "scriptList.sectionIcon": { label: "Script section icon", format: "hex" },
  "scriptList.searchBg": { label: "Script search field", format: "hex" },
  "scriptList.rowText": { label: "Script row text", format: "hex" },
  "scriptList.rowHoverBg": { label: "Script row hover", format: "hex" },
  "aiSidebar.panelBg": { label: "AI sidebar panel", format: "hex" },
  "aiSidebar.panelBorder": { label: "AI sidebar border", format: "rgba" },
  "aiSidebar.headerBg": { label: "AI sidebar header", format: "hex" },
  "aiSidebar.headerText": { label: "AI sidebar title", format: "hex" },
  "aiSidebar.headerMuted": { label: "AI sidebar subtitle", format: "hex" },
  "aiSidebar.messageUserBg": { label: "AI user message", format: "hex" },
  "aiSidebar.messageAssistantBg": { label: "AI assistant message", format: "hex" },
  "aiSidebar.messageBorder": { label: "AI message border", format: "rgba" },
  "aiSidebar.inputText": { label: "AI input text", format: "hex" },
  "aiSidebar.inputPlaceholder": { label: "AI input placeholder", format: "hex" },
  "aiSidebar.iconMuted": { label: "AI muted icons", format: "hex" },
  "aiSidebar.accentText": { label: "AI accent / edit badge", format: "hex" },
  "aiSidebar.warningBg": { label: "AI warning banner", format: "rgba" },
  "aiSidebar.warningText": { label: "AI warning text", format: "hex" },
  "aiSidebar.errorText": { label: "AI error text", format: "hex" },
  "aiOverlay.panelBg": { label: "AI overlay panel", format: "hex" },
  "aiOverlay.panelBorder": { label: "AI overlay border", format: "rgba" },
  "aiOverlay.headerText": { label: "AI overlay header", format: "hex" },
  "aiOverlay.buttonBg": { label: "AI overlay button", format: "rgba" },
  "aiOverlay.buttonText": { label: "AI overlay button text", format: "hex" },
  "aiOverlay.acceptBg": { label: "AI overlay accept button", format: "rgba" },
  "aiOverlay.acceptText": { label: "AI overlay accept text", format: "hex" },
  "aiOverlay.highlightBg": { label: "AI proposal highlight", format: "rgba" },
  "aiOverlay.highlightActiveBg": { label: "AI active proposal highlight", format: "rgba" },
  "aiOverlay.diffRemovedText": { label: "AI diff removed text", format: "hex" },
  "aiOverlay.diffAddedText": { label: "AI diff added text", format: "hex" },
  "actionBar.barBg": { label: "Action bar background", format: "hex" },
  "actionBar.buttonBg": { label: "Action button", format: "hex" },
  "actionBar.buttonBorder": { label: "Action button border", format: "hex" },
  "actionBar.buttonText": { label: "Action button text", format: "hex" },
  "actionBar.buttonIcon": { label: "Action button icon", format: "hex" },
  "icons.color": { label: "Icon color", format: "hex" },
  "icons.muted": { label: "Muted icon color", format: "hex" },
  "settingsChrome.sectionHeaderBg": { label: "Settings section header", format: "hex" },
  "settingsChrome.labelText": { label: "Settings label text", format: "hex" },
  "settingsChrome.checkboxOn": { label: "Checkbox on", format: "hex" },
  "settingsChrome.checkboxOff": { label: "Checkbox off", format: "hex" },
  "settingsChrome.sidebarActiveBg": { label: "Settings sidebar active", format: "hex" },
  "settingsChrome.sidebarAccent": { label: "Settings sidebar accent", format: "hex" },
  "settingsChrome.controlBg": { label: "Settings control background", format: "hex" },
  "settingsChrome.controlBorder": { label: "Settings control border", format: "rgba" },
  "settingsChrome.fieldBg": { label: "Settings field background", format: "hex" },
  "scriptHub.searchBg": { label: "Script hub search", format: "hex" },
  "scriptHub.searchBorder": { label: "Script hub search border", format: "rgba" },
  "scriptHub.toggleIndicator": { label: "Script hub active tab underline", format: "hex" },
  "scriptHub.toggleActiveText": { label: "Script hub active tab text", format: "hex" },
  "scriptHub.toggleInactiveText": { label: "Script hub inactive tab text", format: "hex" },
  "scriptHub.cardGlassBg": { label: "Script hub card glass", format: "rgba" },
  "scriptHub.cardGlassBorder": { label: "Script hub card border", format: "rgba" },
  "scriptHub.cardExecuteBg": { label: "Script hub execute button", format: "rgba" },
  "accent.primary": { label: "Accent primary", format: "hex" },
  "accent.primaryMuted": { label: "Accent muted", format: "hex" },
  "accent.selectionBorder": { label: "Selection border", format: "hex" },
} as const satisfies Record<string, V3LiveEditTargetMeta>;

export function isV3LiveEditPath(path: string): path is V3LiveEditPath {
  return path in V3_LIVE_EDIT_REGISTRY;
}

/** Read a registered live-edit path from a tagged element (primary or fallback). */
export function getLiveEditPathFromElement(el: HTMLElement | SVGElement): V3LiveEditPath | null {
  const path = el.dataset.v3Live ?? el.dataset.v3LiveFallback;
  if (!path || !isV3LiveEditPath(path)) return null;
  return path;
}

export function getLiveEditTargetMeta(path: string): V3LiveEditTargetMeta | null {
  if (!isV3LiveEditPath(path)) return null;
  return V3_LIVE_EDIT_REGISTRY[path];
}

function parsePath(path: V3LiveEditPath): [keyof V3ThemeState, string] {
  const dot = path.indexOf(".");
  const section = path.slice(0, dot) as keyof V3ThemeState;
  const field = path.slice(dot + 1);
  return [section, field];
}

export function getThemeColorAtPath(theme: V3ThemeState, path: string): string | null {
  if (!isV3LiveEditPath(path)) return null;
  const [section, field] = parsePath(path);
  const block = theme[section];
  if (!block || typeof block !== "object") return null;
  const value = (block as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

export function patchThemeColorAtPath(
  path: string,
  value: string,
): Partial<V3ThemeState> | null {
  if (!isV3LiveEditPath(path)) return null;
  const [section, field] = parsePath(path);
  return { [section]: { [field]: value } } as Partial<V3ThemeState>;
}

export {
  colorAlpha,
  colorToHexInput,
  composeColor,
  parseRgba,
  rgbaToHex,
  hexToRgb,
} from "@/app/liveEdit/liveEditColorUtils";

/** Registry of theme tokens reachable via `data-v3-live`. */
