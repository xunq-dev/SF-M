import { useCallback, useEffect, useState } from "react";
import { loadAutoexecuteScripts, loadEditorSidebarScripts } from "./editorSidebarScripts";
import type { WorkspaceScriptEntry } from "./workspaceScriptTypes";

function scriptListFingerprint(entries: WorkspaceScriptEntry[]): string {
  return entries
    .map((s) => `${s.id}:${s.title}:${s.diskPath ?? ""}:${s.content.length}`)
    .join("|");
}

/**
 * Hook to manage the editor sidebar script lists with automatic polling.
 * @param intervalMs The polling interval in milliseconds (default: 5000).
 */
export function useEditorSidebarScripts(intervalMs: number = 20000) {
  const [scripts, setScripts] = useState<WorkspaceScriptEntry[]>([]);
  const [autoexecuteScripts, setAutoexecuteScripts] = useState<WorkspaceScriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [entries, autoEntries] = await Promise.all([
        loadEditorSidebarScripts(),
        loadAutoexecuteScripts(),
      ]);
      setScripts((current) => {
        if (scriptListFingerprint(current) === scriptListFingerprint(entries)) return current;
        return entries;
      });
      setAutoexecuteScripts((current) => {
        if (scriptListFingerprint(current) === scriptListFingerprint(autoEntries)) return current;
        return autoEntries;
      });
    } catch (e) {
      console.warn("Failed to refresh editor sidebar scripts:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void refresh();

    const timer = setInterval(() => {
      if (!cancelled) {
        void refresh();
      }
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return {
    scripts,
    autoexecuteScripts,
    isLoading,
    refresh,
  };
}
