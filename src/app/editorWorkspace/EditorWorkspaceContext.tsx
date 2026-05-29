import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { flushSync } from "react-dom";
import {
  defaultEditorTabs,
  readStoredEditorTabs,
  schedulePersistEditorTabs,
  type StoredEditorTabs,
} from "./editorTabsStorage";
import {
  newTabId,
  TAB_TITLE_MAX_LEN,
  type ScriptTab,
} from "./editorWorkspaceTypes";
import { confirmEditorClear } from "@/app/editorClearDialog";
import {
  downloadScriptAsFile,
  pickAndReadScriptFile,
  pickSaveScriptPath,
  saveScriptToPath,
  scriptTabTitleFromPath,
} from "@/app/scripts/editorDiskScripts";
import { revealEditorSidebarScriptInExplorer } from "@/app/scripts/editorSidebarReveal";
import { isTauriApp } from "@/app/tauriEnv";
import { fetchRawGistScript } from "@/app/synapse-v3/v3GistFetch";

function scriptListPlaceholderContent(title: string): string {
  return `-- ${title}\n-- Placeholder (script list)\n\n`;
}

export type EditorWorkspaceValue = {
  tabs: ScriptTab[];
  activeTabId: string;
  activeTab: ScriptTab;
  setActiveTabId: (id: string) => void;
  updateActiveContent: (content: string) => void;
  addTab: () => void;
  closeTab: (tabId: string, confirmClose: boolean) => Promise<void>;
  /** Close every tab except `keepTabId` and focus that tab. */
  closeAllTabsExcept: (keepTabId: string) => void;
  beginInlineRename: (tab: ScriptTab, opts?: { fromContextMenu?: boolean }) => void;
  editingTabId: string | null;
  setEditingTabId: (id: string | null) => void;
  editDraft: string;
  setEditDraft: (s: string) => void;
  commitInlineRename: () => void;
  cancelInlineRename: () => void;
  renameTab: (tabId: string, newTitle: string) => void;
  skipMenuReturnFocusRef: React.MutableRefObject<boolean>;
  openScriptListInNewEditorTab: (title: string, content?: string) => void;
  openScriptListInCurrentEditorTab: (title: string, content?: string) => void;
  openScriptListInFileExplorer: (fileName?: string) => void;
  closeAllTabsToFresh: () => void;
  clearActiveTabContent: () => void;
  /** Script Hub / external: add or focus tab, returns id to scroll into view. */
  openScriptInEditor: (title: string, content: string) => string;
  /** Open or focus a tab tied to a remote raw URL (always stores latest fetched content). */
  openRemoteScriptInEditor: (title: string, content: string, remoteUrl: string) => string;
  /** Open sidebar script with optional disk path binding. */
  openScriptFromSidebar: (title: string, content: string, diskPath?: string) => string;
  /** Re-fetch the active tab when it has a remoteUrl; returns false if not applicable. */
  refreshActiveRemoteScript: () => Promise<boolean>;
  /** Same as router handoff merge. */
  mergeScriptHubPayload: (title: string, content: string) => string | null;
  /** Open file picker (defaults to linked scripts folder on desktop) and load into a new tab. */
  openScriptFileFromDisk: () => Promise<void>;
  /** Save active tab; desktop writes to disk (pick path if needed). Browser downloads a .lua file. */
  saveActiveScriptToFile: () => Promise<boolean>;
  /** Save a specific tab; returns absolute path or null if cancelled. */
  saveTabToFile: (tabId: string) => Promise<string | null>;
  /** Bind a tab to an on-disk path (and optionally update its title). */
  bindTabDiskPath: (tabId: string, diskPath: string, title?: string) => void;
};

const EditorWorkspaceContext = createContext<EditorWorkspaceValue | null>(null);

function loadInitial(): StoredEditorTabs {
  return readStoredEditorTabs() ?? defaultEditorTabs();
}

export function EditorWorkspaceProvider({ children }: { children: ReactNode }) {
  const initialRef = useRef<StoredEditorTabs | null>(null);
  if (initialRef.current === null) {
    initialRef.current = loadInitial();
  }
  const initial = initialRef.current;

  const [tabs, setTabs] = useState<ScriptTab[]>(() => initial.tabs);
  const [activeTabId, setActiveTabId] = useState(() => initial.activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const skipMenuReturnFocusRef = useRef(false);

  useEffect(() => {
    schedulePersistEditorTabs({ tabs, activeTabId });
  }, [tabs, activeTabId]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0]!,
    [tabs, activeTabId],
  );

  const updateActiveContent = useCallback(
    (content: string) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, content } : t)));
    },
    [activeTabId],
  );

  const addTab = useCallback(() => {
    setTabs((prev) => {
      const title = `Script ${prev.length + 1}`;
      const id = newTabId();
      setActiveTabId(id);
      return [...prev, { id, title, content: "" }];
    });
  }, []);

  const commitInlineRename = useCallback(() => {
    if (!editingTabId) return;
    const trimmed = editDraft.trim().slice(0, TAB_TITLE_MAX_LEN);
    if (trimmed) {
      setTabs((prev) =>
        prev.map((t) => (t.id === editingTabId ? { ...t, title: trimmed } : t)),
      );
    }
    setEditingTabId(null);
  }, [editDraft, editingTabId]);

  const cancelInlineRename = useCallback(() => {
    setEditingTabId(null);
  }, []);

  const renameTab = useCallback((tabId: string, newTitle: string) => {
    const trimmed = newTitle.trim().slice(0, TAB_TITLE_MAX_LEN);
    if (trimmed) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, title: trimmed } : t)),
      );
    }
  }, []);

  const beginInlineRename = useCallback((tab: ScriptTab, opts?: { fromContextMenu?: boolean }) => {
    if (opts?.fromContextMenu) skipMenuReturnFocusRef.current = true;
    setEditingTabId(tab.id);
    setEditDraft(tab.title);
  }, []);

  const closeTab = useCallback(
    async (tabId: string, confirmClose: boolean) => {
      if (tabs.length <= 1) return;
      if (confirmClose) {
        const ok = await confirmEditorClear("tab");
        if (!ok) return;
      }
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (idx < 0) return;
      const nextTabs = tabs.filter((t) => t.id !== tabId);
      const nextActive =
        tabId === activeTabId ? (nextTabs[Math.max(0, idx - 1)] ?? nextTabs[0])!.id : activeTabId;
      flushSync(() => {
        setTabs(nextTabs);
        setActiveTabId(nextActive);
      });
      setEditingTabId((cur) => (cur === tabId ? null : cur));
    },
    [activeTabId, tabs],
  );

  const openScriptListInNewEditorTab = useCallback((title: string, content?: string) => {
    const t = title.slice(0, TAB_TITLE_MAX_LEN);
    const id = newTabId();
    const body = content ?? scriptListPlaceholderContent(t);
    setTabs((prev) => [...prev, { id, title: t, content: body }]);
    setActiveTabId(id);
  }, []);

  const openScriptListInCurrentEditorTab = useCallback(
    (title: string, content?: string) => {
      const t = title.slice(0, TAB_TITLE_MAX_LEN);
      const body = content ?? scriptListPlaceholderContent(t);
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, title: t, content: body } : tab,
        ),
      );
    },
    [activeTabId],
  );

  const openScriptListInBrowserTab = useCallback((title: string, content?: string) => {
    const t = title.slice(0, TAB_TITLE_MAX_LEN);
    const text = content ?? scriptListPlaceholderContent(t);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) {
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } else {
      URL.revokeObjectURL(url);
    }
  }, []);

  const openScriptListInFileExplorer = useCallback((fileName?: string) => {
    void (async () => {
      try {
        if (fileName) {
          const res = await revealEditorSidebarScriptInExplorer(fileName);
          if (!res.ok) {
            window.alert(res.message);
          }
        } else {
          await invoke("open_scripts_folder");
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const closeAllTabsExcept = useCallback(
    (keepTabId: string) => {
      const keep = tabs.find((t) => t.id === keepTabId);
      if (!keep || tabs.length <= 1) return;
      flushSync(() => {
        setTabs([keep]);
        setActiveTabId(keepTabId);
        setEditingTabId((cur) => (cur === keepTabId ? cur : null));
      });
    },
    [tabs],
  );

  const closeAllTabsToFresh = useCallback(() => {
    const id = newTabId();
    flushSync(() => {
      setTabs([{ id, title: "Script", content: "" }]);
      setActiveTabId(id);
      setEditingTabId(null);
    });
  }, []);

  const clearActiveTabContent = useCallback(() => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, content: "" } : t)));
  }, [activeTabId]);

  const mergeScriptHubPayload = useCallback((title: string, content: string) => {
    const t = title.trim().slice(0, TAB_TITLE_MAX_LEN) || "Script";
    let activateId: string | null = null;
    flushSync(() => {
      setTabs((prev) => {
        const existing = prev.find((x) => x.title === t && x.content === content);
        if (existing) {
          activateId = existing.id;
          return prev;
        }
        const id = newTabId();
        activateId = id;
        return [...prev, { id, title: t, content }];
      });
    });
    if (activateId) setActiveTabId(activateId);
    return activateId;
  }, []);

  const openScriptInEditor = useCallback(
    (title: string, content: string) => {
      const id = mergeScriptHubPayload(title, content);
      return id ?? activeTabId;
    },
    [activeTabId, mergeScriptHubPayload],
  );

  const openRemoteScriptInEditor = useCallback(
    (title: string, content: string, remoteUrl: string) => {
      const t = title.trim().slice(0, TAB_TITLE_MAX_LEN) || "Gist";
      let activateId: string | null = null;
      flushSync(() => {
        setTabs((prev) => {
          const existing = prev.find((tab) => tab.remoteUrl === remoteUrl);
          if (existing) {
            activateId = existing.id;
            return prev.map((tab) =>
              tab.id === existing.id ? { ...tab, title: t, content, remoteUrl } : tab,
            );
          }
          const id = newTabId();
          activateId = id;
          return [...prev, { id, title: t, content, remoteUrl }];
        });
      });
      if (activateId) setActiveTabId(activateId);
      return activateId ?? activeTabId;
    },
    [activeTabId],
  );

  const openScriptFromSidebar = useCallback(
    (title: string, content: string, diskPath?: string) => {
      const t = title.trim().slice(0, TAB_TITLE_MAX_LEN) || "Script";
      let activateId: string | null = null;
      flushSync(() => {
        setTabs((prev) => {
          if (diskPath) {
            const existing = prev.find((tab) => tab.diskPath === diskPath);
            if (existing) {
              activateId = existing.id;
              return prev.map((tab) =>
                tab.id === existing.id ? { ...tab, title: t, content, diskPath } : tab,
              );
            }
            const byTitle = prev.find(
              (tab) => !tab.diskPath && !tab.remoteUrl && tab.title.trim() === t,
            );
            if (byTitle) {
              activateId = byTitle.id;
              return prev.map((tab) =>
                tab.id === byTitle.id ? { ...tab, title: t, content, diskPath } : tab,
              );
            }
          }
          const id = newTabId();
          activateId = id;
          return [...prev, { id, title: t, content, ...(diskPath ? { diskPath } : {}) }];
        });
      });
      if (activateId) setActiveTabId(activateId);
      return activateId ?? activeTabId;
    },
    [activeTabId],
  );

  const refreshActiveRemoteScript = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.remoteUrl) return false;
    const content = await fetchRawGistScript(tab.remoteUrl);
    flushSync(() => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content } : t)),
      );
    });
    return true;
  }, [activeTabId, tabs]);

  const openScriptFileFromDisk = useCallback(async () => {
    const picked = await pickAndReadScriptFile();
    if (!picked) return;
    const title = picked.title.slice(0, TAB_TITLE_MAX_LEN);
    const id = newTabId();
    const diskPath = isTauriApp() ? picked.path : undefined;
    flushSync(() => {
      setTabs((prev) => [...prev, { id, title, content: picked.content, diskPath }]);
      setActiveTabId(id);
      setEditingTabId(null);
    });
  }, []);

  const saveTabToFile = useCallback(
    async (tabId: string): Promise<string | null> => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return null;
      if (!isTauriApp()) {
        downloadScriptAsFile(tab.title, tab.content);
        return tab.diskPath ?? null;
      }
      let path = tab.diskPath;
      if (!path) {
        path = (await pickSaveScriptPath(tab.title)) ?? undefined;
        if (!path) return null;
      }
      await saveScriptToPath(path, tab.content);
      const newTitle = await scriptTabTitleFromPath(path);
      flushSync(() => {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const next: ScriptTab = { ...t, diskPath: path };
            if (!t.diskPath) next.title = newTitle;
            return next;
          }),
        );
      });
      return path;
    },
    [tabs],
  );

  const bindTabDiskPath = useCallback((tabId: string, diskPath: string, title?: string) => {
    flushSync(() => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          const next: ScriptTab = { ...t, diskPath };
          if (title) next.title = title.slice(0, TAB_TITLE_MAX_LEN);
          return next;
        }),
      );
    });
  }, []);

  const saveActiveScriptToFile = useCallback(async () => {
    const path = await saveTabToFile(activeTabId);
    return path !== null;
  }, [activeTabId, saveTabToFile]);

  const value = useMemo<EditorWorkspaceValue>(
    () => ({
      tabs,
      activeTabId,
      activeTab,
      setActiveTabId,
      updateActiveContent,
      addTab,
      closeTab,
      closeAllTabsExcept,
      beginInlineRename,
      editingTabId,
      setEditingTabId,
      editDraft,
      setEditDraft,
      commitInlineRename,
      cancelInlineRename,
      renameTab,
      skipMenuReturnFocusRef,
      openScriptListInNewEditorTab,
      openScriptListInCurrentEditorTab,
      openScriptListInFileExplorer,
      closeAllTabsToFresh,
      clearActiveTabContent,
      openScriptInEditor,
      openRemoteScriptInEditor,
      openScriptFromSidebar,
      refreshActiveRemoteScript,
      mergeScriptHubPayload,
      openScriptFileFromDisk,
      saveActiveScriptToFile,
      saveTabToFile,
      bindTabDiskPath,
    }),
    [
      tabs,
      activeTabId,
      activeTab,
      updateActiveContent,
      addTab,
      closeTab,
      closeAllTabsExcept,
      beginInlineRename,
      editingTabId,
      editDraft,
      commitInlineRename,
      cancelInlineRename,
      renameTab,
      skipMenuReturnFocusRef,
      openScriptListInNewEditorTab,
      openScriptListInCurrentEditorTab,
      openScriptListInBrowserTab,
      openScriptListInFileExplorer,
      closeAllTabsToFresh,
      clearActiveTabContent,
      openScriptInEditor,
      openRemoteScriptInEditor,
      openScriptFromSidebar,
      refreshActiveRemoteScript,
      mergeScriptHubPayload,
      openScriptFileFromDisk,
      saveActiveScriptToFile,
      saveTabToFile,
      bindTabDiskPath,
    ],
  );

  return (
    <EditorWorkspaceContext.Provider value={value}>{children}</EditorWorkspaceContext.Provider>
  );
}

export function useEditorWorkspace(): EditorWorkspaceValue {
  const ctx = useContext(EditorWorkspaceContext);
  if (!ctx) {
    throw new Error("useEditorWorkspace must be used within EditorWorkspaceProvider");
  }
  return ctx;
}

/** Optional: for Script Hub outside strict editor tree if ever needed — same as useEditorWorkspace when wrapped. */
export function useEditorWorkspaceOptional(): EditorWorkspaceValue | null {
  return useContext(EditorWorkspaceContext);
}
