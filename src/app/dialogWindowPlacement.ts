import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Logical top-left to center a `widthLogical × heightLogical` window on the **main** window,
 * so confirmation dialogs stay on the same monitor as the shell.
 */
export async function logicalCenterOnMainWindow(
  widthLogical: number,
  heightLogical: number,
): Promise<{ x: number; y: number }> {
  const main = getCurrentWindow();
  const sf = await main.scaleFactor();
  const pos = await main.outerPosition();
  const size = await main.outerSize();
  const logicalLeft = pos.x / sf;
  const logicalTop = pos.y / sf;
  const logicalW = size.width / sf;
  const logicalH = size.height / sf;
  const x = logicalLeft + (logicalW - widthLogical) / 2;
  const y = logicalTop + (logicalH - heightLogical) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}
