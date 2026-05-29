import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  readV3ThemeUiLiveEdit,
  useV3Theme,
  V3_LIVE_EDIT_CHANGED_EVENT,
  type V3ThemeActionBar,
} from "../v3Theme";
import { v3ThemeInlineVars } from "../v3ThemeCss";
import { createPortal } from "react-dom";
import { basename, join } from "@tauri-apps/api/path";
import svgPaths from "../remake-assets/v3-svg-paths";
import { V3TopBar } from "./V3TopBar";
import ScriptMonacoEditor from "@/editor/ScriptMonacoEditor";
import { useEditorWorkspace } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { readStoredEditorThemeId, EDITOR_THEME_CHANGED_EVENT } from "@/editor/editorThemes";
import { useEditorSidebarScripts } from "@/app/scripts/useEditorSidebarScripts";
import { revealWorkspaceScriptInExplorer } from "@/app/scripts/editorSidebarReveal";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import {
  getAutoexecuteDirectoryPath,
  getScriptsDirectoryPath,
  moveScriptBetweenFolders,
  pickAndReadScriptFile,
  saveTabToAutoexecute,
  scriptTabTitleFromPath,
} from "@/app/scripts/editorDiskScripts";
import { readV3Bookmarks, toggleV3Bookmark } from "../v3Bookmarks";
import type { WorkspaceScriptEntry } from "@/app/scripts/workspaceScriptTypes";
import { EditorScriptListPanel } from "@/app/editor/script-list/EditorScriptListPanel";
import { ENHANCED_SCRIPT_LIST_WIDTH_PX } from "@/app/editor/script-list/ScriptListThemeTokens";
import { isEnhancedScriptListEnabled } from "@/app/appSettings";
import { useAppSettings } from "@/app/useAppSettings";
import { ScriptTabDropdownMenu } from "./dormant/ScriptTabDropdownMenu/ScriptTabDropdownMenu";
import { RenameTabPopup } from "./dormant/RenameTabPopup/RenameTabPopup";
import { NameScriptPopup } from "./dormant/NameScriptPopup/NameScriptPopup";
import { AddGistUrlPopup } from "./dormant/AddGistUrlPopup/AddGistUrlPopup";
import { ensureLuaFileName, isAutoexecutePath, sanitizeAutoexecuteBaseName } from "../v3AutoExecute";
import { fetchRawGistScript } from "../v3GistFetch";
import { addV3Gist, isLikelyRawLuaUrl, readV3Gists, removeV3Gist, type V3GistEntry } from "../v3Gists";
import { clampV3ContextMenuPosition } from "../v3ContextMenuPosition";
import { AttachIndicatorIcon } from "./AttachIndicatorIcon";
import { V3FluentIcon } from "./V3FluentIcon";
import type { V3Page } from "../v3PageTypes";
import { useV3Settings } from "../v3Settings";
import { resolveV3EditorLayout } from "../v3EditorLayout";
import { V3AiSidebar } from "./V3AiSidebar";
import { V3AiEditOverlay } from "./V3AiEditOverlay";
import { useEditorAiProposals } from "../EditorAiProposalContext";
import { revealProposal } from "@/editor/editorAiProposals";
import * as monaco from "monaco-editor";
import type * as Monaco from "monaco-editor";

type Page = V3Page;

interface EditorPageProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

/** Boxed icon + label button — original V3 chrome look (chunky `#383838` panel + `#404040` border).
 *
 * In V3 every action is always active (no Attach gate), so `disabled` is only used
 * to keep the option available for legacy stubs that haven't been wired yet. */
function ActionButton({
  bar,
  icon,
  label,
  disabled,
  onClick,
  width,
  height,
  fontSize,
  iconLabelGap,
}: {
  bar: V3ThemeActionBar;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: (e: ReactMouseEvent<HTMLDivElement>) => void;
  width: number;
  height: number;
  fontSize: number;
  iconLabelGap: number;
}) {
  const bg = disabled ? bar.buttonDisabledBg : bar.buttonBg;
  const hoverBg = disabled ? bar.buttonDisabledBg : bar.buttonHover;
  return (
    <div
      className={`rounded-[4px] border border-solid flex items-center justify-center select-none transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      style={{
        width,
        height,
        gap: iconLabelGap,
        background: bg,
        borderColor: bar.buttonBorder,
      }}
      data-v3-live="actionBar.buttonBg"
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = bg;
      }}
      onClick={disabled ? undefined : onClick}
    >
      <span className="flex items-center justify-center shrink-0" data-v3-live="actionBar.buttonIcon">
        {icon}
      </span>
      <span
        data-v3-live="actionBar.buttonText"
        style={{
          fontSize,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          color: disabled ? bar.buttonDisabledText : bar.buttonText,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function V3EditorPage({ currentPage, onNavigate }: EditorPageProps) {
  const theme = useV3Theme();
  const themeVars = useMemo(() => v3ThemeInlineVars(theme), [theme]);
  const { actionBar } = theme;
  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    closeAllTabsExcept,
    updateActiveContent,
    openScriptInEditor,
    openScriptFromSidebar,
    openRemoteScriptInEditor,
    refreshActiveRemoteScript,
    beginInlineRename,
    setEditDraft,
    commitInlineRename,
    cancelInlineRename,
    renameTab,
    clearActiveTabContent,
    closeAllTabsToFresh,
    openScriptFileFromDisk,
    saveActiveScriptToFile,
    saveTabToFile,
    bindTabDiskPath,
  } = useEditorWorkspace();

  const {
    getProposalsForTab,
    acceptAll,
    declineAll,
    cycleReview,
    getReviewIndex,
  } = useEditorAiProposals();
  const monacoEditorRef = useRef<Monaco.editor.ICodeEditor | null>(null);
  const editorWorkAreaRef = useRef<HTMLDivElement | null>(null);
  const aiProposals = getProposalsForTab(activeTab.id);
  const aiReviewIndex = getReviewIndex(activeTab.id);
  const hasAiProposals = aiProposals.length > 0;

  useEffect(() => {
    if (!hasAiProposals) return;
    const proposal = aiProposals[aiReviewIndex];
    const editor = monacoEditorRef.current;
    if (editor && proposal) {
      revealProposal(editor, monaco, proposal);
    }
  }, [aiReviewIndex, aiProposals, hasAiProposals]);

  const bridge = useExecutorBridge();
  const { scripts, autoexecuteScripts, refresh: refreshEditorSidebarScripts } = useEditorSidebarScripts(20000);

  /* V3 auto-attaches via SynapseV3Shell, so `attached === connected`. Every
   * UI element that actually round-trips through the executor (Execute
   * buttons, script-row Execute hover icon, tab context-menu Execute, and
   * the bottom-right Attach indicator) reads this single source of truth. */
  const isAttached = bridge.connected;

  const [editorThemeId, setEditorThemeId] = useState(readStoredEditorThemeId);

  // V3 specific extra state
  const [pinnedTabIds, setPinnedTabIds] = useState<Set<string>>(new Set());
  const [tabIcons, setTabIcons] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const v3Settings = useV3Settings();
  const { settings: appSettings } = useAppSettings();
  const showEnhancedScriptList = isEnhancedScriptListEnabled(appSettings, "synapseV3");
  const scriptListLayoutInset = showEnhancedScriptList ? ENHANCED_SCRIPT_LIST_WIDTH_PX + 3 : 0;
  const tabBarRight = showEnhancedScriptList ? ENHANCED_SCRIPT_LIST_WIDTH_PX + 6 : 0;
  const statusToolbarRight = showEnhancedScriptList ? ENHANCED_SCRIPT_LIST_WIDTH_PX + 13 : 10;
  const layout = useMemo(
    () => resolveV3EditorLayout(v3Settings.compactTabs, v3Settings.compactButtons),
    [v3Settings.compactTabs, v3Settings.compactButtons],
  );

  useEffect(() => {
    const el = editorWorkAreaRef.current;
    if (!el) return;
    const layoutEditor = () => monacoEditorRef.current?.layout();
    const ro = new ResizeObserver(() => layoutEditor());
    ro.observe(el);
    layoutEditor();
    return () => ro.disconnect();
  }, [layout.editorTop, layout.editorBottom, scriptListLayoutInset]);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  const [showCustomize, setShowCustomize] = useState(false);
  const [showSetIcon, setShowSetIcon] = useState(false);

  // Rename popup state
  const [renameTabId, setRenameTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Name script popup (autoexecute save for unsaved tabs)
  const [nameScriptTabId, setNameScriptTabId] = useState<string | null>(null);
  const [nameScriptValue, setNameScriptValue] = useState("");

  // GitHub Gists (raw URL bookmarks in localStorage)
  const [gistEntries, setGistEntries] = useState<V3GistEntry[]>(() => readV3Gists());
  const [showAddGistPopup, setShowAddGistPopup] = useState(false);
  const [addGistUrlValue, setAddGistUrlValue] = useState("");
  const [gistLoadingId, setGistLoadingId] = useState<string | null>(null);
  const [gistRefreshing, setGistRefreshing] = useState(false);

  const cleanupTabMeta = useCallback((tabId: string) => {
    setPinnedTabIds((prev) => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
    setTabIcons((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  }, []);

  const displayTabs = useMemo(() => {
    const pinned = tabs.filter((t) => pinnedTabIds.has(t.id));
    const rest = tabs.filter((t) => !pinnedTabIds.has(t.id));
    return [...pinned, ...rest];
  }, [tabs, pinnedTabIds]);

  useEffect(() => {
    const closeAll = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-v3-context-menu-root]")) return;
      if (target?.closest("[data-v3-rename-popup-root]")) return;
      setContextMenu(null);
      setShowCustomize(false);
      setShowSetIcon(false);
    };
    window.addEventListener("pointerdown", closeAll, true);
    return () => window.removeEventListener("pointerdown", closeAll, true);
  }, []);

  // Custom add tab using default content setting
  const handleAddTab = useCallback(() => {
    const defaultContent = v3Settings.defaultTabContent ?? "";
    openScriptInEditor(`Script ${tabs.length + 1}`, defaultContent);
  }, [openScriptInEditor, tabs.length, v3Settings.defaultTabContent]);

  useEffect(() => {
    const onLiveEditChanged = () => {
      if (readV3ThemeUiLiveEdit()) setContextMenu(null);
    };
    window.addEventListener(V3_LIVE_EDIT_CHANGED_EVENT, onLiveEditChanged);
    return () => window.removeEventListener(V3_LIVE_EDIT_CHANGED_EVENT, onLiveEditChanged);
  }, []);

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    if (readV3ThemeUiLiveEdit()) return;
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = clampV3ContextMenuPosition(e.clientX - 5, e.clientY - 5);
    setContextMenu({ x, y, tabId });
    setShowCustomize(false);
    setShowSetIcon(false);
  };

  useEffect(() => {
    const handler = () => setEditorThemeId(readStoredEditorThemeId());
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, handler);
  }, []);

  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  // Bookmarks — re-read on every toggle
  const [bookmarkSet, setBookmarkSet] = useState(() => readV3Bookmarks());

  const handleToggleBookmark = useCallback((scriptId: string) => {
    toggleV3Bookmark(scriptId);
    setBookmarkSet(readV3Bookmarks());
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
      if (!ok) {
        window.alert("The active tab is not linked to a gist URL.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Refresh failed: ${msg}`);
    } finally {
      setGistRefreshing(false);
    }
  }, [activeTab.remoteUrl, refreshActiveRemoteScript]);

  const handleRevealScript = useCallback(async (script: WorkspaceScriptEntry) => {
    const res = await revealWorkspaceScriptInExplorer(script);
    if (!res.ok) window.alert(res.message);
  }, []);

  const handleOpenGistLink = useCallback((gist: V3GistEntry) => {
    window.open(gist.rawUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleToggleAutoExecute = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      try {
        if (tab.diskPath && isAutoexecutePath(tab.diskPath)) {
          const fileName = await basename(tab.diskPath);
          const scriptsDir = await getScriptsDirectoryPath();
          if (!scriptsDir) {
            window.alert("Scripts folder unavailable.");
            return;
          }
          const dest = await join(scriptsDir, fileName);
          await moveScriptBetweenFolders(tab.diskPath, dest);
          bindTabDiskPath(tabId, dest);
          refreshEditorSidebarScripts();
          return;
        }

        if (tab.diskPath) {
          const fileName = await basename(tab.diskPath);
          const autoDir = await getAutoexecuteDirectoryPath();
          if (!autoDir) {
            window.alert("Autoexecute folder unavailable.");
            return;
          }
          const dest = await join(autoDir, fileName);
          await moveScriptBetweenFolders(tab.diskPath, dest);
          bindTabDiskPath(tabId, dest);
          refreshEditorSidebarScripts();
          return;
        }

        setNameScriptTabId(tabId);
        setNameScriptValue(sanitizeAutoexecuteBaseName(tab.title));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Autoexecute failed: ${msg}`);
      }
    },
    [tabs, bindTabDiskPath, refreshEditorSidebarScripts],
  );

  const handleNameScriptOk = useCallback(async () => {
    if (!nameScriptTabId) return;
    const tab = tabs.find((t) => t.id === nameScriptTabId);
    if (!tab) return;
    const fileName = ensureLuaFileName(nameScriptValue);
    try {
      const path = await saveTabToAutoexecute(fileName, tab.content);
      const displayTitle = await scriptTabTitleFromPath(path);
      bindTabDiskPath(nameScriptTabId, path, displayTitle);
      refreshEditorSidebarScripts();
      setNameScriptTabId(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Save failed: ${msg}`);
    }
  }, [nameScriptTabId, nameScriptValue, tabs, bindTabDiskPath, refreshEditorSidebarScripts]);

  // Script actions
  const handleExecute = useCallback(
    (script: WorkspaceScriptEntry) => {
      void bridge.execute(script.content);
    },
    [bridge],
  );

  const handleOpen = useCallback(
    (script: WorkspaceScriptEntry) => {
      openScriptFromSidebar(script.title, script.content, script.diskPath);
    },
    [openScriptFromSidebar],
  );

  /* ── Bottom-bar action handlers (mirror SynapseXMainPage) ──
   * V3 auto-attaches via SynapseV3Shell, so these never need a separate
   * "Click Attach first" gate — `execute()` short-circuits if the bridge
   * actually isn't connected. */
  const getActiveEditorContent = useCallback(() => {
    const live = monacoEditorRef.current?.getModel()?.getValue();
    return live ?? activeTab.content;
  }, [activeTab.content]);

  const onExecute = useCallback(async () => {
    if (isExecuting) return; // Prevent double-click
    setIsExecuting(true);
    try {
      const res = await bridge.execute(getActiveEditorContent());
      if (!res.ok) window.alert(res.message);
    } finally {
      setIsExecuting(false);
    }
  }, [bridge, getActiveEditorContent, isExecuting]);

  const onClear = useCallback(
    (e: ReactMouseEvent) => {
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

  // Arrow-scrolling for tabs
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = tabsContainerRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState);

    const onScrollEnd = () => updateScrollState();
    el.addEventListener("scrollend", onScrollEnd);

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      el.removeEventListener("scrollend", onScrollEnd);
      ro.disconnect();
    };
  }, [updateScrollState, displayTabs]);

  const scrollTabs = (dir: "left" | "right") => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = layout.tabScrollStep;
    let next: number;
    if (dir === "right") {
      next = el.scrollLeft + step >= max - step ? max : Math.min(el.scrollLeft + step, max);
    } else {
      next = Math.max(el.scrollLeft - step, 0);
    }
    el.scrollTo({ left: next, behavior: "smooth" });
    if (!("onscrollend" in el)) {
      window.setTimeout(updateScrollState, 300);
    }
  };

  const btnIcon = actionBar.buttonIcon;
  const btnIconDisabled = actionBar.buttonDisabledIcon;
  const tabIconSlot = {
    left: layout.tabIconLeft,
    top: layout.tabIconTop,
    width: layout.tabIconSize,
    height: layout.tabIconSize,
  };

  return (
    <div className="size-full relative" style={themeVars}>
      {/* TopBar */}
      <V3TopBar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Thin shadow under tabs — extends over the tab row */}
      <div
        className="absolute bg-[rgba(33,33,32,0.01)] shadow-[0px_21px_24.3px_-8px_rgba(0,0,0,0.32)] pointer-events-none"
        style={{ left: 0, top: layout.tabShadowTop, right: scriptListLayoutInset, height: layout.tabShadowHeight, zIndex: 2 }}
      />

      {/* Shadow overlay on top of the editor — horizontal depth bar */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: layout.editorShadowTop,
          right: scriptListLayoutInset,
          height: 6,
          zIndex: 3,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)",
        }}
      />

      {/* ── Script Tabs with arrow scrolling ── */}
      <div
        className="absolute flex items-center"
        style={{
          left: 0,
          top: layout.tabBarTop,
          height: layout.tabBarHeight,
          right: tabBarRight,
          background: "var(--v3-editor-tabbar-bg, #212120)",
        }}
        data-v3-live="editor.tabBarBg"
      >
        {/* Left scroll arrow */}
        {canScrollLeft && (
          <button
            className="flex items-center justify-center shrink-0 w-[20px] transition-colors z-10"
            style={{ height: layout.tabBarHeight, background: "var(--v3-editor-tab-inactive, #212120)" }}
            data-v3-live="editor.tabInactiveBg"
            onClick={() => scrollTabs("left")}
          >
            <svg viewBox="0 0 8 12" width={8} height={12} fill="none">
              <path d="M7 1L2 6L7 11" stroke="var(--v3-icon-muted, #898989)" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </button>
        )}

        {/* Scrollable tab container */}
        <div
          ref={tabsContainerRef}
          className="flex items-center overflow-x-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: layout.tabGap, paddingLeft: canScrollLeft ? 0 : 4 }}
        >
          {displayTabs.map((tab) => {
            const isPinned = pinnedTabIds.has(tab.id);
            const titleRight = layout.tabTitleRight;
            return (
            <div
              key={tab.id}
              className="relative flex items-center cursor-pointer select-none shrink-0"
              data-v3-live={
                tab.id === activeTabId ? "editor.tabActiveBg" : "editor.tabInactiveBg"
              }
              style={{
                width: layout.tabWidth,
                height: layout.tabHeight,
                borderRadius: layout.tabRadius,
                background:
                  tab.id === activeTabId
                    ? "var(--v3-editor-tab-active, #2d2d2d)"
                    : "var(--v3-editor-tab-inactive, #212120)",
              }}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            >
              {/* Script icon — V3 renders the `* Ω` pair by default; custom icons override. */}
              {tabIcons[tab.id] === "star" ? (
                <div className="absolute" style={tabIconSlot}>
                  <V3FluentIcon name="star24Filled" size={layout.tabIconSize} color="white" />
                </div>
              ) : tabIcons[tab.id] === "lightbulb" ? (
                <div className="absolute" style={tabIconSlot}>
                  <svg viewBox="0 0 24 24" width={layout.tabIconSize} height={layout.tabIconSize} fill="none" stroke="white" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6M10 22h4M15.09 14c.91-.81 1.41-1.84 1.41-3A4.5 4.5 0 0 0 12 6.5 4.5 4.5 0 0 0 7.5 11c0 1.16.5 2.19 1.41 3h6.18z" />
                  </svg>
                </div>
              ) : tabIcons[tab.id] === "turbo" ? (
                <div className="absolute" style={tabIconSlot}>
                  <svg viewBox="0 0 24 24" width={layout.tabIconSize} height={layout.tabIconSize} fill="none" stroke="white" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
              ) : tabIcons[tab.id] === "commands" ? (
                <div className="absolute" style={tabIconSlot}>
                  <svg viewBox="0 0 24 24" width={layout.tabIconSize} height={layout.tabIconSize} fill="none" stroke="white" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
              ) : tabIcons[tab.id] === "beaker" ? (
                <div className="absolute" style={tabIconSlot}>
                  <svg viewBox="0 0 24 24" width={layout.tabIconSize} height={layout.tabIconSize} fill="none" stroke="white" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12M12 3v14M9 12h6M5 21h14M19 17l-5-8V3H10v6l-5 8c-1.3 2.2.3 5 2.8 5h8.4c2.5 0 4.1-2.8 2.8-5z" />
                  </svg>
                </div>
              ) : (
                <div className="absolute" style={tabIconSlot}>
                  <V3FluentIcon name="textAsterisk20Filled" size={layout.tabIconSize} color="white" />
                </div>
              )}
              <span
                className="absolute truncate"
                data-v3-live="editor.tabText"
                style={{
                  left: layout.tabTitleLeft,
                  right: titleRight,
                  fontSize: layout.tabFontSize,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  lineHeight: "normal",
                  color: "var(--v3-editor-tab-text, #ffffff)",
                }}
              >
                {tab.title}
              </span>
              {/* Close button */}
              {isPinned ? (
                <div 
                  className="absolute" 
                  style={{ right: layout.tabCloseRight, top: layout.tabCloseTop + 1, width: 10, height: 10 }}
                  title="Pinned"
                >
                  <svg viewBox="0 0 24 24" width={10} height={10} fill="#888">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                </div>
              ) : (
                <button
                  className="absolute hover:opacity-70 transition-opacity"
                  style={{ right: layout.tabCloseRight, top: layout.tabCloseTop, width: layout.tabCloseSize, height: layout.tabCloseSize }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void closeTab(tab.id, false);
                  }}
                >
                  <svg viewBox="0 0 11 11" width={layout.tabCloseSize} height={layout.tabCloseSize} fill="none">
                    <path d={svgPaths.p3eb4e780} stroke="white" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            );
          })}

          {/* Add tab button */}
          <button
            className="flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
            style={{ width: 12, height: 12 }}
            onClick={handleAddTab}
          >
            <svg viewBox="0 0 11 12" width={11} height={12} fill="none">
              <path d="M5.5 11.5V0.5M0.5 6L10.5 6" stroke="var(--v3-icon-muted, #898989)" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Right scroll arrow */}
        {canScrollRight && (
          <button
            className="flex items-center justify-center shrink-0 w-[20px] transition-colors z-10"
            style={{ height: layout.tabBarHeight, background: "var(--v3-editor-tab-inactive, #212120)" }}
            data-v3-live="editor.tabInactiveBg"
            onClick={() => scrollTabs("right")}
          >
            <svg viewBox="0 0 8 12" width={8} height={12} fill="none">
              <path d="M1 1L6 6L1 11" stroke="var(--v3-icon-muted, #898989)" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </button>
        )}
      </div>

      {/* Editor area — clipped to rounded window */}
      <div
        ref={editorWorkAreaRef}
        className="absolute flex flex-col min-h-0 overflow-hidden"
        style={{
          left: 1,
          top: layout.editorTop,
          right: scriptListLayoutInset,
          bottom: layout.editorBottom,
          background: "var(--v3-editor-work-bg, #1e1e1e)",
        }}
        data-v3-live="editor.workAreaBg"
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ScriptMonacoEditor
            key={activeTab.id}
            value={activeTab.content}
            onChange={updateActiveContent}
            themeId={editorThemeId}
            readOnly={hasAiProposals}
            proposals={aiProposals}
            activeProposalIndex={aiReviewIndex}
            onEditorMount={(editor) => {
              monacoEditorRef.current = editor;
            }}
          />
          <V3AiEditOverlay
            count={aiProposals.length}
            reviewIndex={aiReviewIndex}
            proposal={aiProposals[aiReviewIndex]}
            visible={hasAiProposals}
            onAccept={() => {
              acceptAll(activeTab.id, activeTab.content, updateActiveContent);
            }}
            onDecline={() => declineAll(activeTab.id)}
            onReviewNext={() => cycleReview(activeTab.id)}
          />
        </div>
      </div>

      {showEnhancedScriptList ? (
        <>
          <div
            className="absolute bg-[rgba(33,33,32,0.01)] shadow-[-19px_2px_20.5px_-3px_rgba(0,0,0,0.19)] pointer-events-none"
            style={{
              right: 0,
              top: layout.sidebarShadowTop,
              width: ENHANCED_SCRIPT_LIST_WIDTH_PX + 2,
              bottom: 0,
            }}
          />
          <div
            className="absolute box-border flex min-h-0 shrink-0 flex-col overflow-hidden"
            style={{
              right: 1,
              top: layout.sidebarTop,
              bottom: 0,
              width: ENHANCED_SCRIPT_LIST_WIDTH_PX,
            }}
          >
            <EditorScriptListPanel
              variant="v3"
              className="h-full min-h-0 w-full"
              width={ENHANCED_SCRIPT_LIST_WIDTH_PX}
              scripts={scripts}
              autoexecuteScripts={autoexecuteScripts}
              bridgeConnected={isAttached}
              executeIconColor={btnIcon}
              executeIconDisabledColor={btnIconDisabled}
              bookmarkSet={bookmarkSet}
              onToggleBookmark={handleToggleBookmark}
              gistEntries={gistEntries}
              gistLoadingId={gistLoadingId}
              gistRefreshing={gistRefreshing}
              activeTabRemoteUrl={activeTab.remoteUrl}
              onExecuteScript={handleExecute}
              onOpenScript={handleOpen}
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
              sectionIconSize={layout.sidebarSectionIconSize}
              rowIconSize={layout.sidebarRowIconSize}
              rowActionIconSize={layout.sidebarRowActionIconSize}
              trailingIconSize={layout.sidebarTrailingIconSize}
            />
          </div>
        </>
      ) : null}

      {/* Bottom chrome strip behind action buttons */}
      <div
        className="absolute"
        style={{ left: 0, right: scriptListLayoutInset, bottom: 0, height: layout.actionBarHeight, background: actionBar.barBg }}
        data-v3-live="actionBar.barBg"
      />

      {/* ── Bottom action buttons — boxed icon+label panels, gap: 4 matches the old left=4/99/194/289/384 layout. ── */}
      <div
        className="absolute flex items-center z-[4]"
        style={{ left: 4, bottom: layout.buttonBottomPad, gap: layout.buttonGap }}
      >
        <ActionButton
          bar={actionBar}
          width={layout.buttonWidth}
          height={layout.buttonHeight}
          fontSize={layout.buttonFontSize}
          iconLabelGap={layout.buttonIconLabelGap}
          disabled={!isAttached}
          icon={
            <V3FluentIcon
              name="play20Filled"
              size={layout.buttonIconSize}
              color={isAttached ? btnIcon : btnIconDisabled}
            />
          }
          label="Execute"
          onClick={() => { void onExecute(); }}
        />
        <ActionButton
          bar={actionBar}
          width={layout.buttonWidth}
          height={layout.buttonHeight}
          fontSize={layout.buttonFontSize}
          iconLabelGap={layout.buttonIconLabelGap}
          icon={
            <V3FluentIcon name="eraser20Filled" size={layout.buttonIconSize} color={btnIcon} />
          }
          label="Clear"
          onClick={onClear}
        />
        <ActionButton
          bar={actionBar}
          width={layout.buttonWidth}
          height={layout.buttonHeight}
          fontSize={layout.buttonFontSize}
          iconLabelGap={layout.buttonIconLabelGap}
          icon={
            <V3FluentIcon
              name="documentArrowUp20Filled"
              size={layout.buttonIconSize}
              color={btnIcon}
            />
          }
          label="Open"
          onClick={onOpenFile}
        />
        <ActionButton
          bar={actionBar}
          width={layout.buttonWidth}
          height={layout.buttonHeight}
          fontSize={layout.buttonFontSize}
          iconLabelGap={layout.buttonIconLabelGap}
          disabled={!isAttached}
          icon={
            <V3FluentIcon
              name="settings20Filled"
              size={layout.buttonIconSize}
              color={isAttached ? btnIcon : btnIconDisabled}
            />
          }
          label="Execute"
          onClick={() => { void onExecuteFile(); }}
        />
        <ActionButton
          bar={actionBar}
          width={layout.buttonWidth}
          height={layout.buttonHeight}
          fontSize={layout.buttonFontSize}
          iconLabelGap={layout.buttonIconLabelGap}
          icon={
            <V3FluentIcon name="save20Filled" size={layout.buttonIconSize} color={btnIcon} />
          }
          label="Save"
          onClick={onSaveTab}
        />
      </div>

      {/* ── Right-side status/tool buttons (flex row, mirrors actual V3 spacing). ── */}
      <div
        className="absolute flex items-center"
        style={{ right: statusToolbarRight, bottom: layout.statusBottom, gap: layout.statusIconGap }}
      >
        {/* Attach indicator — linked plug: yellow when disconnected, green when connected. */}
        <div
          className="flex items-center justify-center"
          style={{ width: layout.statusAttachIconSize, height: layout.statusAttachIconSize }}
          title={isAttached ? "Attached" : "Not attached — run the bridge script in your executor"}
          aria-label={isAttached ? "Attached" : "Not attached"}
        >
          <AttachIndicatorIcon
            connected={isAttached}
            onColor={actionBar.attachIndicatorOn}
            offColor={actionBar.attachIndicatorOff}
            size={layout.statusAttachIconSize}
          />
        </div>

        <button
          type="button"
          className="hover:opacity-80 transition-opacity flex items-center justify-center"
          style={{ width: layout.statusUtilityIconSize, height: layout.statusUtilityIconSize }}
          title="Console"
        >
          <V3FluentIcon name="pulseSquare20Regular" size={layout.statusUtilityIconSize} color="white" />
        </button>

        <button
          type="button"
          className="hover:opacity-80 transition-opacity flex items-center justify-center"
          style={{ width: layout.statusUtilityIconSize, height: layout.statusUtilityIconSize }}
          title="Search"
        >
          <V3FluentIcon name="searchSquare20Regular" size={layout.statusUtilityIconSize} color="white" />
        </button>

        {/* Bot/AI icon */}
        <button
          type="button"
          disabled={!v3Settings.aiFeatures}
          className="transition-opacity flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{
            width: layout.statusUtilityIconSize,
            height: layout.statusUtilityIconSize,
            opacity: aiSidebarOpen ? 1 : 0.85,
          }}
          title={
            v3Settings.aiFeatures
              ? aiSidebarOpen
                ? "Close AI Assistant"
                : "AI Assistant"
              : "Enable AI features in Settings"
          }
          onClick={() => {
            if (v3Settings.aiFeatures) setAiSidebarOpen((open) => !open);
          }}
        >
          <V3FluentIcon name="bot20Filled" size={layout.statusUtilityIconSize} color="white" />
        </button>
      </div>

      {/* ══════════════ LEFT AI SIDEBAR (overlay) ══════════════ */}
      {v3Settings.aiFeatures && aiSidebarOpen && (
        <V3AiSidebar
          top={layout.sidebarTop}
          tabId={activeTab.id}
          tabTitle={activeTab.title}
          scriptContent={activeTab.content}
          diskPath={activeTab.diskPath}
          onClose={() => setAiSidebarOpen(false)}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Tab Context Menu ── */}
      {contextMenu && createPortal(
        <div
          data-v3-context-menu-root
          className="fixed z-[9999] pointer-events-auto"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ScriptTabDropdownMenu
            showCustomize={showCustomize}
            setShowCustomize={setShowCustomize}
            showSetIcon={showSetIcon}
            setShowSetIcon={setShowSetIcon}
            executeDisabled={!isAttached}
            isPinned={pinnedTabIds.has(contextMenu.tabId)}
            isAutoExecute={isAutoexecutePath(tabs.find((t) => t.id === contextMenu.tabId)?.diskPath ?? "")}
            onRename={() => {
              setRenameTabId(contextMenu.tabId);
              setRenameValue(tabs.find(t => t.id === contextMenu.tabId)?.title || "");
              setContextMenu(null);
            }}
            onDuplicate={() => {
              const targetTab = tabs.find(t => t.id === contextMenu.tabId);
              if (targetTab) {
                openScriptInEditor(`${targetTab.title} (Copy)`, targetTab.content);
              }
              setContextMenu(null);
            }}
            onExecute={() => {
              const targetTab = tabs.find(t => t.id === contextMenu.tabId);
              if (targetTab) {
                void bridge.execute(targetTab.content);
              }
              setContextMenu(null);
            }}
            onToggleAutoExecute={() => {
              const tabId = contextMenu.tabId;
              setContextMenu(null);
              void handleToggleAutoExecute(tabId);
            }}
            onTogglePin={() => {
              setPinnedTabIds(prev => {
                const next = new Set(prev);
                if (next.has(contextMenu.tabId)) {
                  next.delete(contextMenu.tabId);
                } else {
                  next.add(contextMenu.tabId);
                }
                return next;
              });
              setContextMenu(null);
            }}
            onSetIcon={(iconName) => {
              setTabIcons(prev => ({
                ...prev,
                [contextMenu.tabId]: iconName
              }));
              setContextMenu(null);
            }}
            onCloseAllButThis={() => {
              const keepTabId = contextMenu.tabId;
              for (const t of tabs) {
                if (t.id !== keepTabId) cleanupTabMeta(t.id);
              }
              closeAllTabsExcept(keepTabId);
              setContextMenu(null);
            }}
          />
        </div>,
        document.body
      )}

      {/* ── Rename Modal Overlay ── */}
      {renameTabId && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center" data-v3-rename-popup-root>
          <RenameTabPopup
            value={renameValue}
            onChange={setRenameValue}
            onOk={() => {
              if (renameTabId && renameValue.trim()) {
                renameTab(renameTabId, renameValue.trim());
              }
              setRenameTabId(null);
            }}
            onCancel={() => {
              setRenameTabId(null);
            }}
          />
        </div>
      )}

      {/* ── Name Script Modal (autoexecute) ── */}
      {nameScriptTabId && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center" data-v3-rename-popup-root>
          <NameScriptPopup
            value={nameScriptValue}
            onChange={setNameScriptValue}
            onOk={() => { void handleNameScriptOk(); }}
            onCancel={() => setNameScriptTabId(null)}
          />
        </div>
      )}

      {showAddGistPopup && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center" data-v3-rename-popup-root>
          <AddGistUrlPopup
            value={addGistUrlValue}
            onChange={setAddGistUrlValue}
            onOk={handleAddGistOk}
            onCancel={() => {
              setShowAddGistPopup(false);
              setAddGistUrlValue("");
            }}
          />
        </div>
      )}
    </div>
  );
}
