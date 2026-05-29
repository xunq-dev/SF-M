/** Script tab dropdown menu layout size (see ScriptTabDropdownMenu). */
export const V3_TAB_CONTEXT_MENU_WIDTH = 528;
export const V3_TAB_CONTEXT_MENU_HEIGHT = 397;

const VIEWPORT_PAD = 8;

/**
 * Clamp a fixed-position context menu so it stays fully inside the webview viewport.
 */
export function clampV3ContextMenuPosition(
  x: number,
  y: number,
  menuWidth = V3_TAB_CONTEXT_MENU_WIDTH,
  menuHeight = V3_TAB_CONTEXT_MENU_HEIGHT,
): { x: number; y: number } {
  const maxX = Math.max(VIEWPORT_PAD, window.innerWidth - menuWidth - VIEWPORT_PAD);
  const maxY = Math.max(VIEWPORT_PAD, window.innerHeight - menuHeight - VIEWPORT_PAD);
  return {
    x: Math.min(Math.max(VIEWPORT_PAD, x), maxX),
    y: Math.min(Math.max(VIEWPORT_PAD, y), maxY),
  };
}
