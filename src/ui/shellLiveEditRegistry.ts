import type { ShellThemeState } from "@/ui/shellTheme";
import type { LiveEditColorFormat } from "@/app/liveEdit/liveEditColorUtils";

export const SHELL_LIVE_EDIT_REGISTRY = {
  topBarFrom: { label: "Top bar gradient start", format: "hex" as LiveEditColorFormat },
  topBarTo: { label: "Top bar gradient end", format: "hex" as LiveEditColorFormat },
  shellBg: { label: "Shell background", format: "hex" as LiveEditColorFormat },
  sidebarBg: { label: "Sidebar background", format: "hex" as LiveEditColorFormat },
  pageAreaBg: { label: "Page area background", format: "hex" as LiveEditColorFormat },
  sidebarNavInactiveBg: { label: "Sidebar nav inactive", format: "hex" as LiveEditColorFormat },
  sidebarNavActiveBg: { label: "Sidebar nav active", format: "hex" as LiveEditColorFormat },
  sidebarNavHoverBg: { label: "Sidebar nav hover", format: "hex" as LiveEditColorFormat },
  shellHoverPanelFrom: { label: "Tooltip gradient start", format: "hex" as LiveEditColorFormat },
  shellHoverPanelTo: { label: "Tooltip gradient end", format: "hex" as LiveEditColorFormat },
  editorControlBarButtonFrom: { label: "Editor bar gradient start", format: "hex" as LiveEditColorFormat },
  editorControlBarButtonTo: { label: "Editor bar gradient end", format: "hex" as LiveEditColorFormat },
  editorControlBarBorder: { label: "Editor bar border", format: "hex" as LiveEditColorFormat },
  editorControlBarText: { label: "Editor bar text", format: "hex" as LiveEditColorFormat },
  editorControlBarHoverFrom: { label: "Editor bar hover start", format: "hex" as LiveEditColorFormat },
  editorControlBarHoverTo: { label: "Editor bar hover end", format: "hex" as LiveEditColorFormat },
  attachButtonHoverFrom: { label: "Attach hover start", format: "hex" as LiveEditColorFormat },
  attachButtonHoverTo: { label: "Attach hover end", format: "hex" as LiveEditColorFormat },
  "scriptHubTheme.cardBackground": { label: "Script hub card", format: "hex" as LiveEditColorFormat },
  "scriptHubTheme.titleColor": { label: "Script hub title", format: "hex" as LiveEditColorFormat },
  "scriptHubTheme.searchBackground": { label: "Script hub search", format: "hex" as LiveEditColorFormat },
  "scriptHubTheme.subtitleColor": { label: "Script hub subtitle", format: "hex" as LiveEditColorFormat },
  "initTheme.headerFrom": { label: "Init header gradient start", format: "hex" as LiveEditColorFormat },
  "initTheme.headerTo": { label: "Init header gradient end", format: "hex" as LiveEditColorFormat },
  "initTheme.progressBar": { label: "Init progress bar", format: "hex" as LiveEditColorFormat },
  "attachOverlayTheme.barFill": { label: "Attach overlay bar", format: "hex" as LiveEditColorFormat },
  "attachOverlayTheme.notchFrom": { label: "Attach overlay notch start", format: "hex" as LiveEditColorFormat },
  "attachOverlayTheme.notchTo": { label: "Attach overlay notch end", format: "hex" as LiveEditColorFormat },
  "confirmationTheme.panelBg": { label: "Confirmation dialog bg", format: "hex" as LiveEditColorFormat },
  "confirmationTheme.titleColor": { label: "Confirmation title", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.editorWorkAreaBackground": { label: "Editor work area", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfacePanelBackground": { label: "Panel body", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfacePanelBorder": { label: "Panel border", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceHeaderBackground": { label: "Panel header", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceHeaderBorder": { label: "Header border", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceHeaderText": { label: "Header label", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceListDivider": { label: "List divider", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceListText": { label: "List text", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceListHoverBackground": { label: "List hover", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceListFocusRing": { label: "List focus ring", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceSearchBackground": { label: "Script search field", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceSearchPlaceholder": { label: "Script search placeholder", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceSectionIcon": { label: "Script section icon", format: "hex" as LiveEditColorFormat },
  "surfaceElementsTheme.surfaceRowMutedText": { label: "Script row muted", format: "hex" as LiveEditColorFormat },
} as const;

export type ShellLiveEditPath = keyof typeof SHELL_LIVE_EDIT_REGISTRY;

export function isShellLiveEditPath(path: string): path is ShellLiveEditPath {
  return path in SHELL_LIVE_EDIT_REGISTRY;
}

export function getShellLiveEditPathFromElement(el: HTMLElement | SVGElement): ShellLiveEditPath | null {
  const path = el.getAttribute("data-shell-live") ?? el.getAttribute("data-shell-live-fallback");
  if (!path || !isShellLiveEditPath(path)) return null;
  return path;
}

export function getShellLiveEditTargetMeta(path: string) {
  if (!isShellLiveEditPath(path)) return null;
  return SHELL_LIVE_EDIT_REGISTRY[path];
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : null;
}

function setNestedPartial(path: string, value: string): Partial<ShellThemeState> {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { [path]: value } as Partial<ShellThemeState>;
  }
  const [head, ...rest] = parts;
  return { [head]: setNestedPartial(rest.join("."), value) } as Partial<ShellThemeState>;
}

export function getShellColorAtPath(theme: ShellThemeState, path: string): string | null {
  if (!isShellLiveEditPath(path)) return null;
  if (!path.includes(".")) {
    const v = theme[path as keyof ShellThemeState];
    return typeof v === "string" ? v : null;
  }
  return getNestedValue(theme as unknown as Record<string, unknown>, path);
}

export function patchShellColorAtPath(path: string, value: string): Partial<ShellThemeState> | null {
  if (!isShellLiveEditPath(path)) return null;
  return setNestedPartial(path, value);
}
