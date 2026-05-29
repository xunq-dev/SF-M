import type { MouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import ScriptMonacoEditor from "@/editor/ScriptMonacoEditor";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/app/components/ui/context-menu";
import {
  EDITOR_THEME_CHANGED_EVENT,
  readStoredEditorThemeId,
} from "@/editor/editorThemes";
import { isTauriApp } from "@/app/tauriEnv";
import { APP_SETTINGS_CHANGED_EVENT, readAppSettings } from "@/app/appSettings";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import { useEditorWorkspace } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { TAB_TITLE_MAX_LEN } from "@/app/editorWorkspace/editorWorkspaceTypes";
import { useEditorSidebarScripts } from "@/app/scripts/useEditorSidebarScripts";
import type { WorkspaceScriptEntry } from "@/app/scripts/workspaceScriptTypes";
import { pickAndReadScriptFile } from "@/app/scripts/editorDiskScripts";
import { useEllipsisCycle } from "@/app/synapse-original/lib/useEllipsisCycle";
import {
  SYNAPSE_X_SIZES,
  SYNAPSE_X_WINDOW_LABELS,
  openSynapseXWindow,
} from "@/app/synapse-x/windowOps";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";
import { applyShellWindowMinSize } from "@/app/windowConstraints";
import SynapseXChrome from "@/app/synapse-x/SynapseXChrome";
import { useSynapseXTheme } from "@/app/synapse-x/synapseXTheme";
import { isEnhancedScriptListEnabled } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";
import { EditorScriptListPanel } from "@/app/editor/script-list/EditorScriptListPanel";
import { readV3Bookmarks, toggleV3Bookmark } from "@/app/synapse-v3/v3Bookmarks";
import { fetchRawGistScript } from "@/app/synapse-v3/v3GistFetch";
import {
  addV3Gist,
  isLikelyRawLuaUrl,
  readV3Gists,
  removeV3Gist,
  type V3GistEntry,
} from "@/app/synapse-v3/v3Gists";
import { AddGistUrlDialog } from "@/app/editor/script-list/AddGistUrlDialog";
import { revealWorkspaceScriptInExplorer } from "@/app/scripts/editorSidebarReveal";

const BTN =
  "sx-btn flex h-[33px] min-w-[72px] flex-1 items-center justify-center border border-solid px-1 text-[13px] disabled:opacity-50 transition-colors";

/** 450ms attach animation cadence — matches MainLayout / Synapse Original so executors that
 * arm late still get the same UX. */
const ATTACH_ANIMATION_MS = 450;

/**
 * Synapse X main — WPF chrome with the same `ScriptMonacoEditor`, workspace tabs, and bridge
 * wiring as Synapse Original / default Blue shell. Attach gating mirrors Blue: the click no-ops when
 * the websocket is not connected, and `autoAttach` only fires once we're connected.
 */
export default function SynapseXMainPage() {
  const navigate = useNavigate();
  const bridge = useExecutorBridge();
  const theme = useSynapseXTheme();
  const { settings } = useAppSettings();
  const enhancedScriptList = isEnhancedScriptListEnabled(settings, "synapseX");
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    updateActiveContent,
    addTab,
    closeTab,
    beginInlineRename,
    editingTabId,
    setEditingTabId,
    editDraft,
    setEditDraft,
    commitInlineRename,
    cancelInlineRename,
    closeAllTabsToFresh,
    clearActiveTabContent,
    openScriptFileFromDisk,
    saveActiveScriptToFile,
    openScriptListInNewEditorTab,
    openScriptListInCurrentEditorTab,
    openScriptListInBrowserTab,
    openScriptListInFileExplorer,
    openScriptsFolder,
    openRemoteScriptInEditor,
    refreshActiveRemoteScript,
  } = useEditorWorkspace();

  const [editorTheme, setEditorTheme] = useState(readStoredEditorThemeId);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const [tabScrollHints, setTabScrollHints] = useState({ canLeft: false, canRight: false });
  const [stage, setStage] = useState<"in" | "out">("out");

  useEffect(() => {
    setStage("in");
  }, []);

  const { scripts: editorSidebarScripts, autoexecuteScripts, refresh: refreshEditorSidebarScripts } = useEditorSidebarScripts();
  const [bookmarkSet, setBookmarkSet] = useState(() => readV3Bookmarks());
  const [gistEntries, setGistEntries] = useState<V3GistEntry[]>(() => readV3Gists());
  const [showAddGistPopup, setShowAddGistPopup] = useState(false);
  const [addGistUrlValue, setAddGistUrlValue] = useState("");
  const [gistLoadingId, setGistLoadingId] = useState<string | null>(null);
  const [gistRefreshing, setGistRefreshing] = useState(false);

  const updateTabScrollHints = useCallback(() => {
    const el = tabStripRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setTabScrollHints({
      canLeft: scrollLeft > 3,
      canRight: max > 3 && scrollLeft < max - 3,
    });
  }, []);

  const scrollTabStrip = useCallback((direction: -1 | 1) => {
    const el = tabStripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = Math.max(80, Math.floor(el.clientWidth * 0.72));
    const next =
      direction === 1 ? Math.min(max, el.scrollLeft + step) : Math.max(0, el.scrollLeft - step);
    el.scrollTo({ left: next, behavior: "smooth" });
  }, []);

  useLayoutEffect(() => {
    updateTabScrollHints();
  }, [tabs, updateTabScrollHints]);

  useLayoutEffect(() => {
    const el = tabStripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateTabScrollHints());
    ro.observe(el);
    el.addEventListener("scroll", updateTabScrollHints, { passive: true });
    window.addEventListener("resize", updateTabScrollHints);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateTabScrollHints);
      window.removeEventListener("resize", updateTabScrollHints);
    };
  }, [updateTabScrollHints]);

  const attachingVisible =
    bridge.attachClicked && bridge.connected && !bridge.attached;
  const [showAttachedBanner, setShowAttachedBanner] = useState(false);
  const attachEllipsis = useEllipsisCycle(attachingVisible, 500);

  useEffect(() => {
    if (!bridge.attached) {
      setShowAttachedBanner(false);
      return;
    }
    setShowAttachedBanner(true);
    const t = window.setTimeout(() => setShowAttachedBanner(false), 2000);
    return () => window.clearTimeout(t);
  }, [bridge.attached]);

  const bannerPhase: "attaching" | "attached" | "idle" = attachingVisible
    ? "attaching"
    : showAttachedBanner
      ? "attached"
      : "idle";

  /** Mirror Blue's resizable behaviour on the Synapse X main window: on first mount snap to
   * 801x355 and recenter (we just came from the 418x117 loader); when the user toggles
   * `resizableWindow` from any settings UI, flip `setResizable` + min size live, and only
   * snap-back the size when going from on -> off. */
  const prevResizableRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isTauriApp()) return;
    const apply = () => {
      void (async () => {
        const win = getCurrentWindow();
        const settings = readAppSettings();
        const { width, height } = SYNAPSE_X_SIZES.main;
        const prev = prevResizableRef.current;
        prevResizableRef.current = settings.resizableWindow;
        try {
          await win.setResizable(settings.resizableWindow);
        } catch {
          /* ignore */
        }
        try {
          await applyShellWindowMinSize(settings.resizableWindow);
        } catch {
          /* ignore */
        }
        const initialMount = prev === null;
        const justDisabled = prev === true && settings.resizableWindow === false;
        if (initialMount || justDisabled) {
          try {
            await win.setSize(new LogicalSize(width, height));
            await centerWindowOnCurrentMonitor();
          } catch {
            /* ignore */
          }
        }
      })();
    };
    apply();
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  useEffect(() => {
    const sync = () => setEditorTheme(readStoredEditorThemeId());
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** F9 -> open / focus the Synapse X console window. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F9" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const { width, height } = SYNAPSE_X_SIZES.console;
      if (!isTauriApp()) {
        navigate("/synapse-x/console");
        return;
      }
      void openSynapseXWindow(SYNAPSE_X_WINDOW_LABELS.console, "/synapse-x/console", width, height, "Console");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const prevTabCountRef = useRef(tabs.length);
  useLayoutEffect(() => {
    const el = tabStripRef.current;
    if (el && tabs.length > prevTabCountRef.current) {
      el.scrollLeft = el.scrollWidth;
    }
    prevTabCountRef.current = tabs.length;
  }, [tabs.length]);

  /**
   * Blue-parity attach gate: do nothing when the websocket isn't connected so the user
   * can't end up "attached" without a live bridge. Mirrors the EditorPage attach button
   * (default UI) — `markAttachClicked` always runs (banner needs it), then we bail when
   * not connected; otherwise we kick off the attach arm timer.
   */
  const armTimerRef = useRef<number | null>(null);
  const onAttachClick = useCallback(() => {
    if (bridge.attached) return;
    bridge.markAttachClicked();
    if (!bridge.connected) return;
    if (bridge.attachArmed) return;
    if (armTimerRef.current != null) return;
    armTimerRef.current = window.setTimeout(() => {
      armTimerRef.current = null;
      bridge.armAfterAttachAnimation();
    }, ATTACH_ANIMATION_MS);
  }, [bridge]);

  useEffect(
    () => () => {
      if (armTimerRef.current != null) {
        window.clearTimeout(armTimerRef.current);
        armTimerRef.current = null;
      }
    },
    [],
  );

  /** AutoAttach on mount once the bridge is connected — mirrors MainLayout's startup hook. */
  const didStartupAutoAttachRef = useRef(false);
  useEffect(() => {
    if (didStartupAutoAttachRef.current) return;
    if (!readAppSettings().autoAttach) return;
    if (!bridge.connected) return;
    if (bridge.attachArmed) {
      didStartupAutoAttachRef.current = true;
      return;
    }
    didStartupAutoAttachRef.current = true;
    bridge.markAttachClicked();
    if (armTimerRef.current != null) return;
    armTimerRef.current = window.setTimeout(() => {
      armTimerRef.current = null;
      bridge.armAfterAttachAnimation();
    }, ATTACH_ANIMATION_MS);
  }, [bridge.connected, bridge.attachArmed, bridge]);

  const onExecute = useCallback(async () => {
    const res = await bridge.execute(activeTab.content);
    if (!res.ok) window.alert(res.message);
  }, [bridge, activeTab.content]);

  const onClear = useCallback(
    (e: MouseEvent) => {
      if (e.shiftKey) {
        closeAllTabsToFresh();
        return;
      }
      clearActiveTabContent();
    },
    [closeAllTabsToFresh, clearActiveTabContent],
  );

  const onOpenFile = useCallback(() => {
    void (async () => {
      await openScriptFileFromDisk();
      refreshEditorSidebarScripts();
    })();
  }, [openScriptFileFromDisk, refreshEditorSidebarScripts]);

  const onExecuteFile = useCallback(async () => {
    const picked = await pickAndReadScriptFile();
    if (!picked) return;
    const res = await bridge.execute(picked.content);
    if (!res.ok) window.alert(res.message);
  }, [bridge]);

  /** Save the active tab to disk. Surface any error from the dialog plugin / writer
   * via `window.alert` so the click never appears to do nothing. */
  const onSaveTab = useCallback(() => {
    void (async () => {
      try {
        const ok = await saveActiveScriptToFile();
        if (ok) refreshEditorSidebarScripts();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Save failed: ${msg}`);
      }
    })();
  }, [saveActiveScriptToFile, refreshEditorSidebarScripts]);

  const handleToggleBookmark = useCallback((scriptId: string) => {
    toggleV3Bookmark(scriptId);
    setBookmarkSet(readV3Bookmarks());
  }, []);

  const handleExecuteScript = useCallback(
    (script: WorkspaceScriptEntry) => {
      void bridge.execute(script.content);
    },
    [bridge],
  );

  const handleOpenScript = useCallback(
    (script: WorkspaceScriptEntry) => {
      openScriptListInNewEditorTab(script.title, script.content);
    },
    [openScriptListInNewEditorTab],
  );

  const handleRevealScript = useCallback(async (script: WorkspaceScriptEntry) => {
    const res = await revealWorkspaceScriptInExplorer(script);
    if (!res.ok) window.alert(res.message);
  }, []);

  const handleOpenGistLink = useCallback((gist: V3GistEntry) => {
    window.open(gist.rawUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleOpenGist = useCallback(
    async (gist: V3GistEntry) => {
      setGistLoadingId(gist.id);
      try {
        const content = await fetchRawGistScript(gist.rawUrl);
        openRemoteScriptInEditor(gist.title, content, gist.rawUrl);
      } catch (e) {
        window.alert(`Could not load gist: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setGistLoadingId(null);
      }
    },
    [openRemoteScriptInEditor],
  );

  const handleExecuteGist = useCallback(
    async (gist: V3GistEntry) => {
      setGistLoadingId(gist.id);
      try {
        const content = await fetchRawGistScript(gist.rawUrl);
        const res = await bridge.execute(content);
        if (!res.ok) window.alert(res.message);
      } catch (e) {
        window.alert(`Could not load gist: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setGistLoadingId(null);
      }
    },
    [bridge],
  );

  const handleAddGistOk = useCallback(() => {
    const url = addGistUrlValue.trim();
    if (!url) return;
    if (!isLikelyRawLuaUrl(url) && !window.confirm("This URL does not look like a raw .lua link. Add it anyway?")) {
      return;
    }
    addV3Gist(url);
    setGistEntries(readV3Gists());
    setShowAddGistPopup(false);
    setAddGistUrlValue("");
  }, [addGistUrlValue]);

  const handleRefreshGists = useCallback(async () => {
    if (!activeTab.remoteUrl) {
      window.alert("Open a gist in the editor first, then refresh to pull the latest version.");
      return;
    }
    setGistRefreshing(true);
    try {
      const ok = await refreshActiveRemoteScript();
      if (!ok) window.alert("The active tab is not linked to a gist URL.");
    } finally {
      setGistRefreshing(false);
    }
  }, [activeTab.remoteUrl, refreshActiveRemoteScript]);

  const openSettingsWindow = useCallback(() => {
    if (!isTauriApp()) {
      navigate("/synapse-x/settings");
      return;
    }
    const { width, height } = SYNAPSE_X_SIZES.settings;
    void openSynapseXWindow(SYNAPSE_X_WINDOW_LABELS.settings, "/synapse-x/settings", width, height, "Options");
  }, [navigate]);

  const openScriptHubWindow = useCallback(() => {
    if (!isTauriApp()) {
      navigate("/synapse-x/script-hub");
      return;
    }
    const { width, height } = SYNAPSE_X_SIZES.scriptHub;
    void openSynapseXWindow(SYNAPSE_X_WINDOW_LABELS.scriptHub, "/synapse-x/script-hub", width, height, "Script Hub");
  }, [navigate]);

  const onMinimize = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().minimize();
  }, []);

  const onClose = useCallback(() => {
    if (!isTauriApp()) return;
    void getCurrentWindow().close();
  }, []);

  const beginRename = useCallback(
    (tabId: string, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = tabs.find((x) => x.id === tabId);
      if (!t) return;
      setActiveTabId(t.id);
      beginInlineRename(t);
    },
    [tabs, setActiveTabId, beginInlineRename],
  );

  const closeTabHandler = useCallback(
    (tabId: string, e: MouseEvent) => {
      e.stopPropagation();
      void closeTab(tabId, false);
    },
    [closeTab],
  );

  const buttonStyle = {
    backgroundColor: "var(--sx-button-bg, #2d2d2d)",
    color: "var(--sx-button-text, #ffffff)",
    borderColor: "var(--sx-button-border, #2a2a2a)",
  } as const;

  return (
    <div 
      className="h-full w-full overflow-hidden transition-opacity duration-700 ease-in-out"
      style={{ opacity: stage === "in" ? 1 : 0 }}
    >
      {/* Dynamic hover/active styles for Synapse X theme buttons */}
      <style>{`
        .sx-btn:hover:not(:disabled) { background-color: var(--sx-button-hover-bg, #3a3a3a) !important; }
        .sx-btn:active:not(:disabled) { background-color: var(--sx-button-active-bg, #252525) !important; }
        .sx-script-item:hover { background-color: var(--sx-list-hover-bg, #333333) !important; }
      `}</style>
      <SynapseXChrome
        title="Synapse X"
        titleStatus={
          bannerPhase === "attached" ? (
            <>-  [Attached!]</>
          ) : bannerPhase === "attaching" ? (
            <>
              -  [Attaching
              <span className="inline-block min-w-[1.1em] text-left">{attachEllipsis}</span>
              ]
            </>
          ) : null
        }
        variant="main"
        onMinimize={onMinimize}
        onClose={onClose}
      >
        <div className="relative flex h-full min-h-0 flex-col">
          {/* Optional overlay layer — only the main Synapse X window paints this. Sits
              above the window fill but below buttons/editor so it tints the WPF chrome
              without covering inputs. */}
          {theme.overlayDataUrl ? (
            <div
              className={`pointer-events-none absolute inset-0 ${theme.overlayMode === "top" ? "z-[999]" : "z-[1]"}`}
              aria-hidden
              style={{
                backgroundImage: `url(${theme.overlayDataUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: theme.overlayMode === "top" ? Math.min(theme.overlayOpacity, 0.7) : theme.overlayOpacity,
              }}
            />
          ) : null}

          <div className="relative z-[2] flex min-h-0 flex-1 flex-row gap-[7px] px-2 pt-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                className="relative mb-[1px] flex h-[16px] shrink-0 flex-row items-center justify-between gap-1"
                style={{ backgroundColor: "var(--sx-window-bg, #333333)" }}
                data-sx-live="windowBg"
              >
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-row items-center overflow-hidden">
                  <div
                    ref={tabStripRef}
                    className="flex min-h-0 min-w-0 flex-1 flex-row items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {tabs.map((tab) => {
                      const active = tab.id === activeTabId;
                      const renaming = editingTabId === tab.id;
                      return (
                        <div
                          key={tab.id}
                          className={`relative inline-flex h-[15px] min-h-[15px] min-w-[72px] shrink-0 flex-row items-stretch overflow-hidden border border-solid ${
                            renaming
                              ? "max-w-[min(340px,calc(100%-24px))]"
                              : "max-w-[min(260px,calc(100%-24px))]"
                          }`}
                          data-sx-live={active ? "tabActiveBg" : "tabBg"}
                          style={{
                            borderColor: active ? "var(--sx-tab-active-border, #484848)" : "var(--sx-tab-border, #3a3a3a)",
                            backgroundColor: active ? "var(--sx-tab-active-bg, #3c3c3c)" : "var(--sx-tab-bg, #323232)",
                          }}
                        >
                          <span
                            className="absolute bottom-0 left-0 right-0 z-[1] h-[2px]"
                            style={{
                              backgroundColor: active
                                ? "var(--sx-tab-active-border, #484848)"
                                : "var(--sx-tab-border, #3a3a3a)",
                            }}
                            data-sx-live={active ? "tabActiveBorder" : "tabBorder"}
                            aria-hidden
                          />
                          {renaming ? (
                            <input
                              type="text"
                              autoFocus
                              className="box-border min-h-0 min-w-0 flex-1 px-1 font-sans text-[10px] leading-[12px] outline-none"
                              style={{ backgroundColor: "var(--sx-button-bg, #2d2d2d)", color: "var(--sx-tab-text, #c0c0c0)" }}
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value.slice(0, TAB_TITLE_MAX_LEN))}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={commitInlineRename}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelInlineRename();
                                  setEditingTabId(null);
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="min-h-0 min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-1 py-0 text-left"
                              onClick={() => setActiveTabId(tab.id)}
                              onDoubleClick={(e) => beginRename(tab.id, e)}
                              aria-current={active ? "true" : undefined}
                              title="Double-click to rename"
                            >
                              <span className="block min-w-0 truncate pt-[1px] font-sans text-[10px] leading-[12px]" style={{ color: "var(--sx-tab-text, #c0c0c0)" }} data-sx-live="tabText">
                                {tab.title}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex h-full w-[14px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 relative z-[1]"
                            aria-label={`Close ${tab.title}`}
                            onClick={(e) => closeTabHandler(tab.id, e)}
                          >
                            <svg className="block size-[9px]" fill="none" viewBox="0 0 9 9" data-sx-live="iconColor">
                              <path d="M8 1L1 8M8 8L1 1" stroke="var(--sx-icon-color, #C0C0C0)" strokeLinecap="butt" strokeWidth="2" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {tabScrollHints.canLeft ? (
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-7 items-center justify-start">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[var(--sx-window-bg,#333333)] from-[18%] via-[var(--sx-window-bg,#333333)]/85 via-45% to-transparent"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => scrollTabStrip(-1)}
                        className="sx-btn pointer-events-auto relative ml-px flex h-[13px] w-[18px] shrink-0 items-center justify-center rounded-r-[2px] border border-solid shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
                        style={buttonStyle}
                        data-sx-live="buttonBg"
                        aria-label="Scroll tabs left"
                      >
                        <ChevronLeft className="size-[12px] opacity-95" strokeWidth={2.25} aria-hidden data-sx-live="iconColor" />
                      </button>
                    </div>
                  ) : null}
                  {tabScrollHints.canRight ? (
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-end">
                      <div
                        className="absolute inset-0 bg-gradient-to-l from-[var(--sx-window-bg,#333333)] from-[18%] via-[var(--sx-window-bg,#333333)]/85 via-45% to-transparent"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => scrollTabStrip(1)}
                        className="sx-btn pointer-events-auto relative mr-px flex h-[13px] w-[18px] shrink-0 items-center justify-center rounded-l-[2px] border border-solid shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
                        style={buttonStyle}
                        data-sx-live="buttonBg"
                        aria-label="Scroll tabs right"
                      >
                        <ChevronRight className="size-[12px] opacity-95" strokeWidth={2.25} aria-hidden data-sx-live="iconColor" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-row items-center">
                    <button
                      type="button"
                      aria-label="Add script tab"
                      className="relative size-[15px] shrink-0 cursor-pointer border-0 bg-transparent p-0"
                      onClick={addTab}
                      data-sx-live="iconColor"
                    >
                    <svg className="block size-full" fill="none" viewBox="0 0 15 15">
                      <g>
                        <rect fill="var(--sx-tab-active-bg, #3C3C3C)" height="14" stroke="var(--sx-tab-active-border, #484848)" width="14" x="0.5" y="0.5" />
                        <path d="M7.5 3L7.5 12M12 7.5L3 7.5" stroke="var(--sx-icon-color, #C0C0C0)" strokeLinecap="butt" strokeWidth="2" />
                      </g>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden ring-1 ring-black/30" style={{ backgroundColor: "var(--sx-editor-bg, #1e1e1e)" }} data-sx-live="editorBg">
                <ScriptMonacoEditor
                  value={activeTab.content}
                  onChange={updateActiveContent}
                  themeId={editorTheme}
                />
              </div>
            </div>

            <div
              className={`box-border flex h-full min-h-0 shrink-0 flex-col overflow-hidden w-[139px] ${enhancedScriptList ? "" : "overflow-y-auto px-1 py-1 text-[12px]"}`}
              style={{
                backgroundColor: "var(--sx-panel-bg, #3C3C3C)",
                color: "var(--sx-text, #ffffff)",
              }}
              data-sx-live="panelBg"
            >
              {enhancedScriptList ? (
                <EditorScriptListPanel
                  variant="sx"
                  className="h-full min-h-0 w-full"
                  scripts={editorSidebarScripts}
                  autoexecuteScripts={autoexecuteScripts}
                  bridgeConnected={bridge.connected}
                  executeIconColor={theme.text}
                  executeIconDisabledColor="#8e8e8e"
                  bookmarkSet={bookmarkSet}
                  onToggleBookmark={handleToggleBookmark}
                  gistEntries={gistEntries}
                  gistLoadingId={gistLoadingId}
                  gistRefreshing={gistRefreshing}
                  activeTabRemoteUrl={activeTab.remoteUrl}
                  onExecuteScript={handleExecuteScript}
                  onOpenScript={handleOpenScript}
                  onRevealScript={handleRevealScript}
                  onExecuteGist={handleExecuteGist}
                  onOpenGist={handleOpenGist}
                  onOpenGistLink={handleOpenGistLink}
                  onRemoveGist={(g) => {
                    removeV3Gist(g.id);
                    setGistEntries(readV3Gists());
                  }}
                  onRequestAddGist={() => {
                    setAddGistUrlValue("");
                    setShowAddGistPopup(true);
                  }}
                  onRefreshGist={() => {
                    void handleRefreshGists();
                  }}
                />
              ) : (
              <>
              {editorSidebarScripts.length === 0 ? (
                <p className="px-0.5 py-1 font-sans text-[9px] leading-snug text-[#a3a3a3]">
                  Add <span className="font-mono text-[8px]">.lua</span> to{" "}
                  <span className="font-mono text-[8px]">scripts</span>.
                </p>
              ) : null}
              {editorSidebarScripts.map((script) => (
                <ContextMenu key={script.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      key={script.id}
                      type="button"
                      title={script.title}
                      className="sx-script-item relative shrink-0 w-full whitespace-normal break-words py-[2px] text-left font-sans text-[11px] leading-snug outline-none transition-colors"
                      onClick={() => openScriptListInNewEditorTab(script.title, script.content)}
                    >
                      <span className="pointer-events-none absolute inset-0 z-0" data-sx-live="listHoverBg" aria-hidden />
                      <span
                        className="relative z-[1] block"
                        style={{ color: "var(--sx-list-text, #c0c0c0)" }}
                        data-sx-live="listText"
                      >
                        {script.title}
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="z-[220] min-w-[180px] rounded-none border border-[#2a2a2a] bg-[#2d2d2d] p-0.5 text-white shadow-md">
                    <ContextMenuItem
                      className="cursor-pointer rounded-none px-2 py-1.5 text-[12px] text-white focus:bg-[#3c3c3c] focus:text-white"
                      onSelect={() => openScriptListInCurrentEditorTab(script.title, script.content)}
                    >
                      (Open in editor)
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="cursor-pointer rounded-none px-2 py-1.5 text-[12px] text-white focus:bg-[#3c3c3c] focus:text-white"
                      onSelect={() => openScriptListInFileExplorer()}
                    >
                      Open in file explorer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
              </>
              )}
            </div>
          </div>

          <div className="relative z-[2] mt-auto flex shrink-0 flex-wrap gap-1 px-2.5 pb-2 pt-1">
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={() => void onExecute()}>
              <span data-sx-live="buttonText">Execute</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={onClear}>
              <span data-sx-live="buttonText">Clear</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={onOpenFile}>
              <span data-sx-live="buttonText">Open File</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={() => void onExecuteFile()}>
              <span data-sx-live="buttonText">Execute File</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={() => void onSaveTab()}>
              <span data-sx-live="buttonText">Save File</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={openSettingsWindow}>
              <span data-sx-live="buttonText">Options</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={onAttachClick}>
              <span data-sx-live="buttonText">Attach</span>
            </button>
            <button type="button" className={BTN} style={buttonStyle} data-sx-live="buttonBg" onClick={openScriptHubWindow}>
              <span data-sx-live="buttonText">Script Hub</span>
            </button>
          </div>
        </div>
      </SynapseXChrome>

      {showAddGistPopup ? (
        <AddGistUrlDialog
          variant="sx"
          value={addGistUrlValue}
          onChange={setAddGistUrlValue}
          onCancel={() => {
            setShowAddGistPopup(false);
            setAddGistUrlValue("");
          }}
          onOk={handleAddGistOk}
        />
      ) : null}
    </div>
  );
}
