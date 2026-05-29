import {
  PhysicalPosition,
  cursorPosition,
  currentMonitor,
  getCurrentWindow,
  monitorFromPoint,
  type Monitor,
} from "@tauri-apps/api/window";

async function centerWindowInWorkArea(monitor: Monitor): Promise<void> {
  const win = getCurrentWindow();
  const outer = await win.outerSize();
  const wa = monitor.workArea;
  const x = wa.position.x + Math.max(0, (wa.size.width - outer.width) / 2);
  const y = wa.position.y + Math.max(0, (wa.size.height - outer.height) / 2);
  await win.setPosition(new PhysicalPosition(x, y));
}

/** Centers on the monitor that contains the cursor (e.g. where the user launched the app). */
export async function centerWindowOnCursorMonitor(): Promise<void> {
  try {
    const cursor = await cursorPosition();
    const monitor = await monitorFromPoint(cursor.x, cursor.y);
    if (monitor) {
      await centerWindowInWorkArea(monitor);
      return;
    }
  } catch {
    /* fall through */
  }
  await getCurrentWindow().center();
}

/** Centers on the monitor that currently contains this window (keeps it on the same display when resizing). */
export async function centerWindowOnCurrentMonitor(): Promise<void> {
  try {
    const monitor = await currentMonitor();
    if (monitor) {
      await centerWindowInWorkArea(monitor);
      return;
    }
  } catch {
    /* fall through */
  }
  await getCurrentWindow().center();
}
