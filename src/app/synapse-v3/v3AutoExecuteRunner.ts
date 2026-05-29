import { loadAutoexecuteScripts } from "@/app/scripts/editorSidebarScripts";

/** Execute every script in the autoexecute folder sequentially. */
export async function runAutoexecuteScripts(
  execute: (source: string) => Promise<{ ok: true; id: string } | { ok: false; message: string }>,
): Promise<void> {
  const scripts = await loadAutoexecuteScripts();
  for (const script of scripts) {
    if (!script.content.trim()) continue;
    await execute(script.content);
  }
}
