import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { flushSync } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router";
import {
  clearScriptHubHandoffStorage,
  peekScriptHubHandoff,
} from "../scriptHub/openScriptInEditor";
import { useShellChrome } from "../shellChromeContext";
import ScriptMonacoEditor from "@/editor/ScriptMonacoEditor";
import { ShellFitLine } from "../components/ShellFitLine";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../components/ui/context-menu";
import {
  EDITOR_THEME_CHANGED_EVENT,
  readStoredEditorThemeId,
} from "@/editor/editorThemes";
import { SHELL_THEME_CHANGED_EVENT } from "@/ui/shellTheme";
import { isEnhancedScriptListEnabled } from "../appSettings";
import { useAppSettings } from "../useAppSettings";
import { confirmEditorClear } from "../editorClearDialog";
import { useEditorWorkspace } from "../editorWorkspace/EditorWorkspaceContext";
import { TAB_TITLE_MAX_LEN } from "../editorWorkspace/editorWorkspaceTypes";
import { useEditorSidebarScripts } from "../scripts/useEditorSidebarScripts";
import { revealWorkspaceScriptInExplorer } from "../scripts/editorSidebarReveal";
import type { WorkspaceScriptEntry } from "../scripts/workspaceScriptTypes";
import { useExecutorBridge } from "../executorBridge/ExecutorBridgeContext";
import { GradientLiveEditHitZones } from "../liveEdit/GradientLiveEditHitZones";
import { useShellLiveEdit } from "@/ui/ShellLiveEditContext";
import { EditorScriptListPanel } from "@/app/editor/script-list/EditorScriptListPanel";
import { SCRIPT_LIST_PANEL_WIDTH } from "@/app/editor/script-list/ScriptListThemeTokens";
import {
  scriptListTokensFromSurfaceElements,
  useScriptListThemeVars,
} from "@/app/editor/script-list/useScriptListThemeVars";
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

interface EditorPageContext {
  setIsAttaching: (value: boolean) => void;
}

function escapeSelectorId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function ControlBarLiveEditZones({
  enabled,
  hovered,
  buttonId,
}: {
  enabled: boolean;
  hovered: string | null;
  buttonId: string;
}) {
  const isHovered = hovered === buttonId;
  return (
    <GradientLiveEditHitZones
      enabled={enabled}
      fromPath={isHovered ? "editorControlBarHoverFrom" : "editorControlBarButtonFrom"}
      toPath={isHovered ? "editorControlBarHoverTo" : "editorControlBarButtonTo"}
      className="absolute inset-x-0 z-[1]"
    />
  );
}

export default function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAttaching } = useOutletContext<EditorPageContext>();
  const { hasPageBackground, pageAreaBg, shellTheme } = useShellChrome();
  const { enabled: liveEditEnabled } = useShellLiveEdit();
  const { settings } = useAppSettings();
  const bridge = useExecutorBridge();
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
    editDraft,
    setEditDraft,
    commitInlineRename,
    cancelInlineRename,
    skipMenuReturnFocusRef,
    openScriptListInNewEditorTab,
    openScriptListInCurrentEditorTab,
    openScriptListInBrowserTab,
    openScriptListInFileExplorer,
    openScriptsFolder,
    closeAllTabsToFresh,
    clearActiveTabContent,
    mergeScriptHubPayload,
    openScriptFileFromDisk,
    saveActiveScriptToFile,
    openRemoteScriptInEditor,
    refreshActiveRemoteScript,
  } = useEditorWorkspace();

  const [editorTheme, setEditorTheme] = useState(readStoredEditorThemeId);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const prevTabCountRef = useRef(tabs.length);
  const pendingScrollEditorTabIdRef = useRef<string | null>(null);
  const [tabScrollHints, setTabScrollHints] = useState({ canLeft: false, canRight: false });
  const [attachHover, setAttachHover] = useState(false);
  const { scripts: editorSidebarScripts, autoexecuteScripts, refresh: refreshEditorSidebarScripts } = useEditorSidebarScripts();
  const showEnhancedScriptList = isEnhancedScriptListEnabled(settings, "default");

  const [bookmarkSet, setBookmarkSet] = useState(() => readV3Bookmarks());
  const [gistEntries, setGistEntries] = useState<V3GistEntry[]>(() => readV3Gists());
  const [showAddGistPopup, setShowAddGistPopup] = useState(false);
  const [addGistUrlValue, setAddGistUrlValue] = useState("");
  const [gistLoadingId, setGistLoadingId] = useState<string | null>(null);
  const [gistRefreshing, setGistRefreshing] = useState(false);

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
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Could not load gist: ${msg}`);
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
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Could not load gist: ${msg}`);
      } finally {
        setGistLoadingId(null);
      }
    },
    [bridge],
  );

  const handleAddGistOk = useCallback(() => {
    const url = addGistUrlValue.trim();
    if (!url) return;
    if (!isLikelyRawLuaUrl(url)) {
      const proceed = window.confirm(
        "This URL does not look like a raw .lua link. Add it anyway?",
      );
      if (!proceed) return;
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

  const controlBarStyle = useMemo(
    () => ({
      borderColor: shellTheme.editorControlBarBorder,
      color: shellTheme.editorControlBarText,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.editorControlBarButtonFrom}, ${shellTheme.editorControlBarButtonTo})`,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.09)",
    }),
    [
      shellTheme.editorControlBarBorder,
      shellTheme.editorControlBarText,
      shellTheme.editorControlBarButtonFrom,
      shellTheme.editorControlBarButtonTo,
    ],
  );

  const [hoveredBarButton, setHoveredBarButton] = useState<string | null>(null);
  const controlBarHoverStyle = useMemo(
    () => ({
      ...controlBarStyle,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.editorControlBarHoverFrom}, ${shellTheme.editorControlBarHoverTo})`,
    }),
    [controlBarStyle, shellTheme.editorControlBarHoverFrom, shellTheme.editorControlBarHoverTo],
  );

  const se = shellTheme.surfaceElementsTheme;
  const scriptListThemeVars = useMemo(
    () => useScriptListThemeVars("shell", scriptListTokensFromSurfaceElements(se)),
    [se],
  );
  const scriptListPanelStyle = useMemo(
    () => ({
      borderColor: se.surfacePanelBackground,
      backgroundColor: se.surfacePanelBackground,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    }),
    [se.surfacePanelBackground],
  );
  const attachBarStyle = useMemo(() => {
    if (attachHover) {
      return {
        ...controlBarStyle,
        backgroundImage: `linear-gradient(to bottom, ${shellTheme.attachButtonHoverFrom}, ${shellTheme.attachButtonHoverTo})`,
      };
    }
    return controlBarStyle;
  }, [attachHover, controlBarStyle, shellTheme.attachButtonHoverFrom, shellTheme.attachButtonHoverTo]);

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

  useLayoutEffect(() => {
    const strip = tabStripRef.current;
    if (tabs.length > prevTabCountRef.current && strip) {
      strip.scrollTo({ left: strip.scrollWidth - strip.clientWidth, behavior: "smooth" });
    }
    prevTabCountRef.current = tabs.length;
  }, [tabs.length]);

  useLayoutEffect(() => {
    const id = pendingScrollEditorTabIdRef.current;
    if (!id) return;
    pendingScrollEditorTabIdRef.current = null;
    const strip = tabStripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-editor-tab-id="${escapeSelectorId(id)}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [tabs]);

  const scrollTabStrip = useCallback((direction: -1 | 1) => {
    const el = tabStripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = Math.max(120, Math.floor(el.clientWidth * 0.72));
    const next =
      direction === 1 ? Math.min(max, el.scrollLeft + step) : Math.max(0, el.scrollLeft - step);
    el.scrollTo({ left: next, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const sync = () => setEditorTheme(readStoredEditorThemeId());
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useLayoutEffect(() => {
    const open = peekScriptHubHandoff(location.state);
    if (!open?.openId) return;

    const title = open.title.trim().slice(0, TAB_TITLE_MAX_LEN) || "Script";
    const content = open.content;

    let activateId: string | null = null;
    flushSync(() => {
      activateId = mergeScriptHubPayload(title, content);
      if (activateId) {
        pendingScrollEditorTabIdRef.current = activateId;
      }
    });

    navigate(location.pathname, { replace: true, state: {} });
    queueMicrotask(() => clearScriptHubHandoffStorage());
  }, [location.state, location.key, location.pathname, navigate, mergeScriptHubPayload]);

  const chromeLabels = shellTheme.editorChromeLabels;

  const runClearCurrentTab = useCallback(async () => {
    if (settings.clearConfirmation) {
      const ok = await confirmEditorClear("current");
      if (!ok) return;
    }
    clearActiveTabContent();
  }, [clearActiveTabContent, settings.clearConfirmation]);

  const runCloseAllTabs = useCallback(async () => {
    if (settings.clearConfirmation) {
      const ok = await confirmEditorClear("all");
      if (!ok) return;
    }
    closeAllTabsToFresh();
  }, [closeAllTabsToFresh, settings.clearConfirmation]);

  useLayoutEffect(() => {
    if (!editingTabId) return;
    const el = renameInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editingTabId]);

  const tabMenuContentClass =
    "z-[220] min-w-0 rounded-none border border-[#5a5a5a] bg-[#3d3d3d] p-0.5 text-white shadow-md";
  const tabMenuItemClass =
    "cursor-pointer rounded-none text-[13px] text-white focus:bg-[#4a4a4a] focus:text-white";

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col pl-[10px] pr-[5px] pb-[5px] pt-[7px]"
      style={{ backgroundColor: hasPageBackground ? "transparent" : pageAreaBg }}
    >
      <p className="pointer-events-none min-w-0 shrink-0 select-none font-light">
        <ShellFitLine basePx={21} fitOptions={{ minPx: 6 }}>
          {chromeLabels.editorPageTitle}
        </ShellFitLine>
      </p>

      <div className="mt-[7px] flex min-h-0 flex-1 gap-[10px]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative w-full shrink-0" data-shell-live="surfaceElementsTheme.surfaceHeaderBackground">
        <div className="relative min-h-[26px]">
          <div
            ref={tabStripRef}
            className="flex min-h-[26px] touch-pan-x items-center gap-[2px] overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const chipBg = isActive ? "bg-[#535353]" : "bg-[#474747]";
              if (editingTabId === tab.id) {
                return (
                  <div
                    key={tab.id}
                    className={`flex min-h-[24px] shrink-0 items-center px-[10px] ${chipBg}`}
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={editDraft}
                      maxLength={TAB_TITLE_MAX_LEN}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={commitInlineRename}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitInlineRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelInlineRename();
                        }
                      }}
                      className="m-0 box-border min-h-[22px] min-w-[1.5ch] max-w-[min(320px,100%)] border-0 bg-transparent px-0 py-0.5 text-[13px] font-normal leading-[1.45] text-white outline-none ring-0 focus:ring-0 [field-sizing:content]"
                      aria-label="Tab name"
                    />
                  </div>
                );
              }
              return (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      data-editor-tab-id={tab.id}
                      title={tab.title}
                      onClick={() => setActiveTabId(tab.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        beginInlineRename(tab);
                      }}
                      className={`flex min-h-[24px] min-w-0 max-w-[280px] shrink-0 items-center px-[10px] ${chipBg}`}
                    >
                      <ShellFitLine basePx={13} className="font-normal text-white">
                        {tab.title}
                      </ShellFitLine>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent
                    className={tabMenuContentClass}
                    onCloseAutoFocus={(e) => {
                      if (skipMenuReturnFocusRef.current) {
                        e.preventDefault();
                        skipMenuReturnFocusRef.current = false;
                      }
                    }}
                  >
                    <div className="flex flex-row gap-px">
                      <ContextMenuItem
                        className={`${tabMenuItemClass} flex flex-1 justify-center gap-1.5 px-2 py-1.5`}
                        onSelect={() => beginInlineRename(tab, { fromContextMenu: true })}
                      >
                        <Pencil className="size-3.5 shrink-0 opacity-90" aria-hidden />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem
                        variant="destructive"
                        disabled={tabs.length <= 1}
                        className={`${tabMenuItemClass} flex flex-1 justify-center gap-1.5 border-l border-[#555555] px-2 py-1.5 data-[disabled]:opacity-40`}
                        onSelect={() => {
                          void closeTab(tab.id, settings.closeFileConfirmation);
                        }}
                      >
                        <X className="size-3.5 shrink-0" aria-hidden />
                        Close
                      </ContextMenuItem>
                    </div>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            <button
              type="button"
              onClick={addTab}
              className="flex h-[16px] w-[17px] shrink-0 items-center justify-center bg-[#69686b]"
              aria-label="New script tab"
            >
              <svg className="h-[8px] w-[8px]" fill="none" viewBox="0 0 9.5 9">
                <path
                  d="M4.76515 8V1M1 4.58979H8.5"
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>

          {tabScrollHints.canLeft ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-stretch justify-start">
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#222] from-[18%] via-[#222]/85 via-45% to-transparent"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => scrollTabStrip(-1)}
                className="pointer-events-auto relative mt-0.5 flex h-[19px] w-[22px] shrink-0 items-center justify-center rounded-r-[3px] border border-[#4a4a4a]/90 bg-[#353535]/95 text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] backdrop-blur-[2px] transition-colors hover:bg-[#404040] active:bg-[#2f2f2f]"
                aria-label="Scroll tabs left"
              >
                <ChevronLeft className="size-[15px] opacity-95" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}

          {tabScrollHints.canRight ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 items-stretch justify-end">
              <div
                className="absolute inset-0 bg-gradient-to-l from-[#222] from-[18%] via-[#222]/85 via-45% to-transparent"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => scrollTabStrip(1)}
                className="pointer-events-auto relative mt-0.5 flex h-[19px] w-[22px] shrink-0 items-center justify-center rounded-l-[3px] border border-[#4a4a4a]/90 bg-[#353535]/95 text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] backdrop-blur-[2px] transition-colors hover:bg-[#404040] active:bg-[#2f2f2f]"
                aria-label="Scroll tabs right toward new tab"
              >
                <ChevronRight className="size-[15px] opacity-95" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
          </div>

          <div
            className="-mt-1 box-border min-h-0 flex-1 overflow-hidden"
            style={{ backgroundColor: se.editorWorkAreaBackground }}
            data-shell-live="surfaceElementsTheme.editorWorkAreaBackground"
          >
            <ScriptMonacoEditor
              key={activeTab.id}
              value={activeTab.content}
              onChange={updateActiveContent}
              themeId={editorTheme}
            />
          </div>
        </div>

        {showEnhancedScriptList ? (
          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[2px] border"
            style={{ ...scriptListPanelStyle, ...scriptListThemeVars, width: SCRIPT_LIST_PANEL_WIDTH.shell }}
            aria-label="Editor sidebar scripts"
          >
            <EditorScriptListPanel
              variant="shell"
              className="h-full min-h-0 w-full"
              scripts={editorSidebarScripts}
              autoexecuteScripts={autoexecuteScripts}
              bridgeConnected={bridge.connected}
              executeIconColor={shellTheme.editorControlBarText}
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
          </div>
        ) : (
        <div
          className="flex min-h-0 w-[107px] shrink-0 flex-col overflow-hidden rounded-[2px] border"
          style={scriptListPanelStyle}
          aria-label="Editor sidebar scripts"
          data-shell-live="surfaceElementsTheme.surfacePanelBackground"
        >
          <div className="shell-script-browser-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-[3px] py-[2px]">
            <ul className="m-0 list-none p-0">
            {editorSidebarScripts.length === 0 ? (
              <li className="px-1 py-2 text-[9px] leading-snug opacity-70" style={{ color: se.surfaceListText }}>
                Add <span className="font-mono text-[10px]">.lua</span> files to{" "}
                <span className="font-mono text-[10px]">scripts</span>.
              </li>
            ) : null}
            {editorSidebarScripts.map((script) => (
              <li
                key={script.id}
                className="border-b last:border-b-0"
                style={{ borderBottomColor: se.surfaceListDivider }}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      title={script.title}
                      onClick={() => openScriptListInNewEditorTab(script.title, script.content)}
                      className="w-full py-[4px] text-left text-[10px] leading-[1.35] outline-none transition-colors focus-visible:outline focus-visible:outline-1"
                      style={{
                        color: se.surfaceListText,
                        outlineColor: se.surfaceListFocusRing,
                        backgroundColor: "transparent",
                      }}
                      data-shell-live="surfaceElementsTheme.surfaceListText"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = se.surfaceListHoverBackground;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span className="block break-words opacity-90">{script.title}</span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={`${tabMenuContentClass} min-w-[188px]`}>
                    <ContextMenuItem
                      className={`${tabMenuItemClass} px-2 py-1.5`}
                      onSelect={() => openScriptListInCurrentEditorTab(script.title, script.content)}
                    >
                      (Open in editor)
                    </ContextMenuItem>
                    <ContextMenuItem
                      className={`${tabMenuItemClass} px-2 py-1.5`}
                      onSelect={() => openScriptListInFileExplorer(script.fileName)}
                    >
                      Open in file explorer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </li>
            ))}
            </ul>
          </div>
        </div>
        )}
      </div>

      <div className="mt-[5px] flex shrink-0 select-none items-center justify-between gap-[4px]">
        <div className="flex min-w-0 flex-wrap gap-[4px]">
          <button
          type="button"
          style={hoveredBarButton === "execute" ? controlBarHoverStyle : controlBarStyle}
          className="relative flex h-[36px] min-w-0 w-[91px] items-center justify-center border px-0.5"
          onMouseEnter={() => setHoveredBarButton("execute")}
          onMouseLeave={() => setHoveredBarButton(null)}
          onClick={() => {
            void (async () => {
              const res = await bridge.execute(activeTab.content);
              if (!res.ok) window.alert(res.message);
            })();
          }}
        >
          <ControlBarLiveEditZones enabled={liveEditEnabled} hovered={hoveredBarButton} buttonId="execute" />
          <ShellFitLine basePx={13} className="text-center font-normal">
            {chromeLabels.editorButtonExecute}
          </ShellFitLine>
        </button>

        <button
          type="button"
          style={hoveredBarButton === "clear" ? controlBarHoverStyle : controlBarStyle}
          className="relative flex h-[36px] min-w-0 w-[91px] items-center justify-center border px-0.5"
          onMouseEnter={() => setHoveredBarButton("clear")}
          onMouseLeave={() => setHoveredBarButton(null)}
          onClick={(e) => {
            e.preventDefault();
            void (e.shiftKey ? runCloseAllTabs() : runClearCurrentTab());
          }}
        >
          <ControlBarLiveEditZones enabled={liveEditEnabled} hovered={hoveredBarButton} buttonId="clear" />
          <ShellFitLine basePx={13} className="text-center font-normal">
            {chromeLabels.editorButtonClear}
          </ShellFitLine>
        </button>

        <button
          type="button"
          style={hoveredBarButton === "open" ? controlBarHoverStyle : controlBarStyle}
          className="relative flex h-[36px] min-w-0 w-[91px] items-center justify-center border px-0.5"
          onMouseEnter={() => setHoveredBarButton("open")}
          onMouseLeave={() => setHoveredBarButton(null)}
          onClick={() => {
            void (async () => {
              await openScriptFileFromDisk();
              refreshEditorSidebarScripts();
            })();
          }}
        >
          <ControlBarLiveEditZones enabled={liveEditEnabled} hovered={hoveredBarButton} buttonId="open" />
          <ShellFitLine basePx={13} className="text-center font-normal">
            {chromeLabels.editorButtonOpenFile}
          </ShellFitLine>
        </button>

        <button
          type="button"
          style={hoveredBarButton === "execfile" ? controlBarHoverStyle : controlBarStyle}
          className="relative flex h-[36px] min-w-0 w-[91px] items-center justify-center border px-0.5"
          onMouseEnter={() => setHoveredBarButton("execfile")}
          onMouseLeave={() => setHoveredBarButton(null)}
        >
          <ControlBarLiveEditZones enabled={liveEditEnabled} hovered={hoveredBarButton} buttonId="execfile" />
          <ShellFitLine basePx={13} className="text-center font-normal">
            {chromeLabels.editorButtonExecuteFile}
          </ShellFitLine>
        </button>

        <button
          type="button"
          style={hoveredBarButton === "save" ? controlBarHoverStyle : controlBarStyle}
          className="relative flex h-[36px] min-w-0 w-[91px] items-center justify-center border px-0.5"
          onMouseEnter={() => setHoveredBarButton("save")}
          onMouseLeave={() => setHoveredBarButton(null)}
          onClick={() => {
            void (async () => {
              const ok = await saveActiveScriptToFile();
              if (ok) refreshEditorSidebarScripts();
            })();
          }}
        >
          <ControlBarLiveEditZones enabled={liveEditEnabled} hovered={hoveredBarButton} buttonId="save" />
          <ShellFitLine basePx={13} className="text-center font-normal">
            {chromeLabels.editorButtonSaveFile}
          </ShellFitLine>
        </button>
        </div>

        <button
          type="button"
          onClick={() => {
            bridge.markAttachClicked();
            if (!bridge.connected) return;
            if (bridge.attachArmed) return;
            setIsAttaching(true);
          }}
          onMouseEnter={() => setAttachHover(true)}
          onMouseLeave={() => setAttachHover(false)}
          style={attachBarStyle}
          className="relative flex h-[36px] min-w-0 w-[109px] shrink-0 items-center justify-center border px-0.5 transition-[background-image] duration-150"
        >
          <GradientLiveEditHitZones
            enabled={liveEditEnabled}
            fromPath={attachHover ? "attachButtonHoverFrom" : "editorControlBarButtonFrom"}
            toPath={attachHover ? "attachButtonHoverTo" : "editorControlBarButtonTo"}
            className="absolute inset-x-0 z-[1]"
          />
          <ShellFitLine basePx={13} fitOptions={{ minPx: 6 }} className="text-center font-normal">
            {chromeLabels.editorButtonAttach}
          </ShellFitLine>
        </button>
      </div>

      {showAddGistPopup ? (
        <AddGistUrlDialog
          variant="shell"
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
