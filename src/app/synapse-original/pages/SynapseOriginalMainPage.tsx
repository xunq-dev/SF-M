import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useOgTheme } from "@/app/synapse-original/ogTheme";
import { resolveTopBarLogoUrl } from "@/ui/topBarLogos";
import TopBarBrandMark from "@/app/components/TopBarBrandMark";
import { useOgLiveEdit } from "@/app/synapse-original/OgLiveEditContext";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/app/components/ui/context-menu";
import ScriptMonacoEditor from "@/editor/ScriptMonacoEditor";
import {
  EDITOR_THEME_CHANGED_EVENT,
  readStoredEditorThemeId,
} from "@/editor/editorThemes";
import { isTauriApp } from "@/app/tauriEnv";
import { useExecutorBridge } from "@/app/executorBridge/ExecutorBridgeContext";
import { useEditorWorkspace } from "@/app/editorWorkspace/EditorWorkspaceContext";
import { TAB_TITLE_MAX_LEN } from "@/app/editorWorkspace/editorWorkspaceTypes";
import { useEditorSidebarScripts } from "@/app/scripts/useEditorSidebarScripts";
import type { WorkspaceScriptEntry } from "@/app/scripts/workspaceScriptTypes";
import { useEllipsisCycle } from "@/app/synapse-original/lib/useEllipsisCycle";
import {
  SYNAPSE_ORIGINAL_SIZES,
  SYNAPSE_ORIGINAL_WINDOW_LABELS,
  openSynapseOriginalWindow,
} from "@/app/synapse-original/windowOps";
import { APP_SETTINGS_CHANGED_EVENT, isEnhancedScriptListEnabled, readAppSettings } from "@/app/appSettings";
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
import {
  applyShellWindowMinSize,
  dblClickMaximizeIfResizable,
} from "@/app/windowConstraints";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";

/**
 * Pixel-perfect Figma anchors at the canonical 838x372 main window. With Resizable enabled
 * the outer wrapper becomes `h-full w-full`, every region absolutely-positions against
 * top/right/bottom/left so chrome stays anchored and the editor / tab strip / button row
 * stretch to fill the gained space (mirroring Blue's fluid behaviour).
 *
 *   right-of-editor = SCRIPT_LIST_W + EDITOR_TO_SCRIPT_LIST_GAP + SCRIPT_LIST_RIGHT
 *                   = 139         + 7                          + 12               = 158
 */
const TOP_BAR_H = 58;
const TAB_STRIP_TOP = 70;
const TAB_STRIP_H = 16;
const EDITOR_TOP = 87;
const SCRIPT_LIST_TOP = 69;
const LEGACY_SCRIPT_LIST_W = 139;
const SCRIPT_LIST_RIGHT = 12;
const EDITOR_TO_SCRIPT_LIST_GAP = 7;
const EDITOR_LEFT = 8;
const EDITOR_RIGHT_LEGACY = SCRIPT_LIST_RIGHT + LEGACY_SCRIPT_LIST_W + EDITOR_TO_SCRIPT_LIST_GAP;
const EDITOR_BOTTOM = 61;
const BOTTOM_BUTTONS_H = 39;
const BOTTOM_BUTTONS_BOTTOM = 10;
const BOTTOM_BUTTONS_LEFT = 9;
const BOTTOM_BUTTONS_RIGHT = 12;
const BOTTOM_BUTTONS_GAP = 5;

function MainChromeButton({
  flexBasis,
  children,
  onClick,
  onMouseDown,
  disabled,
  ariaLabel,
}: {
  /** Original Figma button width (px). Doubles as flex-grow weight so the row keeps
   *  the same proportions when the user grows the window past 838px. */
  flexBasis: number;
  children: ReactNode;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className="og-chrome-btn box-border flex h-full min-w-0 cursor-pointer items-center justify-center overflow-hidden border border-solid p-0 text-center font-['Inter:Regular',sans-serif] text-[20px] font-normal leading-[normal] disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        flex: `${flexBasis} 1 0`,
        borderColor: "var(--og-button-border, #2d2d2d)",
        backgroundColor: "var(--og-button-bg, #272727)",
        color: "var(--og-button-text, #ffffff)",
      }}
      data-og-live="buttonBg"
    >
      <span data-og-live="buttonText">{children}</span>
    </button>
  );
}

/**
 * Synapse Original Main window — pixel-accurate (838x372) port of the Figma `MainWindow`. All
 * actions are wired to the existing `EditorWorkspaceContext` (tabs, save, open) and
 * `ExecutorBridgeContext` (attach + execute). Script Hub / Settings & Clients / F9 console
 * each open in a separate synapse-original-* `WebviewWindow`. The right-hand script list mirrors the
 * default editor sidebar (`.lua` files from `editor-sidebar-scripts`), not the open-tab strip.
 */
export default function SynapseOriginalMainPage() {
  const bridge = useExecutorBridge();
  const ogTheme = useOgTheme();
  const { settings } = useAppSettings();
  const enhancedScriptList = isEnhancedScriptListEnabled(settings, "synapseOriginal");
  const scriptListW = LEGACY_SCRIPT_LIST_W;
  const editorRight = SCRIPT_LIST_RIGHT + scriptListW + EDITOR_TO_SCRIPT_LIST_GAP;
  const { enabled: liveEditEnabled } = useOgLiveEdit();
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

  /**
   * Banner state:
   * - "Attaching" only narrates while the websocket is actually connected and we are
   *   waiting for the arm animation to finish (no bare-clicked banner when the bridge
   *   is dead).
   * - "Attached!" auto-hides 2 seconds after `bridge.attached` first becomes true.
   * The Attach button label is a fixed string elsewhere; this state only drives the banner.
   */
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

  /** Mirror Blue's resizable behaviour on the OG main window: on first mount snap to 838x372 and
   * recenter (we just came from the loading window dimensions); when the user toggles
   * `resizableWindow` from any settings UI, flip `setResizable` + min size live, and only
   * snap-back the size when going from on -> off. */
  const prevResizableRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isTauriApp()) return;
    const apply = () => {
      void (async () => {
        const win = getCurrentWindow();
        const settings = readAppSettings();
        const { width, height } = SYNAPSE_ORIGINAL_SIZES.main;
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

  /** F9 -> open / focus the synapse-original console window. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F9" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const { width, height } = SYNAPSE_ORIGINAL_SIZES.console;
      void openSynapseOriginalWindow(SYNAPSE_ORIGINAL_WINDOW_LABELS.console, "/synapse-original/console", width, height, "Console");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** When a new tab is created, scroll the tab strip to the right so it's visible. */
  const prevTabCountRef = useRef(tabs.length);
  useLayoutEffect(() => {
    const el = tabStripRef.current;
    if (el && tabs.length > prevTabCountRef.current) {
      el.scrollLeft = el.scrollWidth;
    }
    prevTabCountRef.current = tabs.length;
  }, [tabs.length]);

  const onAttachClick = useCallback(() => {
    if (bridge.attached) return;
    bridge.markAttachClicked();
    // Default UI's ~450ms attach animation cadence; arming gates `execute()` regardless of
    // whether the websocket happens to be live yet.
    window.setTimeout(() => {
      bridge.armAfterAttachAnimation();
    }, 450);
  }, [bridge]);

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

  const onSaveTab = useCallback(() => {
    void (async () => {
      const ok = await saveActiveScriptToFile();
      if (ok) refreshEditorSidebarScripts();
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

  const openScriptHub = useCallback(() => {
    const { width, height } = SYNAPSE_ORIGINAL_SIZES.scriptHub;
    void openSynapseOriginalWindow(SYNAPSE_ORIGINAL_WINDOW_LABELS.scriptHub, "/synapse-original/script-hub", width, height, "Script Hub");
  }, []);

  const openSettings = useCallback(() => {
    const { width, height } = SYNAPSE_ORIGINAL_SIZES.settings;
    void openSynapseOriginalWindow(SYNAPSE_ORIGINAL_WINDOW_LABELS.settings, "/synapse-original/settings", width, height, "Settings & Clients");
  }, []);

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


  return (
    <div 
      className="relative h-full w-full overflow-hidden transition-opacity duration-700 ease-in-out" 
      style={{ opacity: stage === "in" ? 1 : 0 }}
      data-name="Main Window"
    >
      {/* Dynamic hover/active styles for OG theme buttons — CSS vars can't be set via Tailwind hover: */}
      <style>{`
        .og-chrome-btn:hover:not(:disabled) { background-color: var(--og-button-hover-bg, #303030) !important; }
        .og-chrome-btn:active:not(:disabled) { background-color: var(--og-button-active-bg, #2a2a2a) !important; }
        .og-script-item:hover { background-color: var(--og-list-hover-bg, #333333) !important; }
      `}</style>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "var(--og-window-bg, #232323)" }}
        data-og-live-fallback="windowBg"
      />

      {/* Optional overlay: only the OG main window paints this layer. Sits above the window
          fill (z 0) and below every chrome layer (z 5+) so it tints the background without
          covering buttons / editor / tabs. */}
      {ogTheme.overlayDataUrl ? (
        <div
          className={`pointer-events-none absolute inset-0 ${ogTheme.overlayMode === "top" ? "z-[999]" : "z-[1]"}`}
          aria-hidden
          style={{
            backgroundImage: `url(${ogTheme.overlayDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: ogTheme.overlayMode === "top" ? Math.min(ogTheme.overlayOpacity, 0.7) : ogTheme.overlayOpacity,
          }}
        />
      ) : null}

      {/* Top bar — stretches across the full window width when the user grows the shell. */}
      <div
        className="absolute inset-x-0 top-0 z-[5]"
        style={{ height: TOP_BAR_H, backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-tauri-drag-region
        data-og-live="panelBg"
        onDoubleClick={() => void dblClickMaximizeIfResizable()}
      />
      <div
        className="absolute z-[6] flex h-[29px] left-[9px] top-[15px] w-[139px] items-center justify-start overflow-hidden"
        style={{ backgroundColor: "var(--og-panel-bg, #282828)" }}
        data-tauri-drag-region
        onDoubleClick={() => void dblClickMaximizeIfResizable()}
      >
        <TopBarBrandMark
          mode={ogTheme.logoMode}
          imageSrc={resolveTopBarLogoUrl({ logoDataUrl: ogTheme.logoDataUrl, topBarLogoPreset: ogTheme.logoPreset })}
          textLogo={{
            text: ogTheme.logoText,
            color: ogTheme.logoTextColor,
            fontId: ogTheme.logoTextFontId,
            sizePx: ogTheme.logoTextSizePx,
            weight: ogTheme.logoTextWeight,
            letterSpacing: ogTheme.logoTextLetterSpacing,
          }}
          alt=""
          className="pointer-events-none max-h-full max-w-full object-contain object-left"
        />
        {liveEditEnabled ? (
          <span
            className="pointer-events-none absolute left-[100px] top-1/2 z-[8] -translate-y-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ background: "#2563a8", color: "#fff" }}
          >
            LIVE EDIT
          </span>
        ) : null}
      </div>

      {/* Attach status */}
      {bannerPhase !== "idle" ? (
        <div className="absolute contents left-[152px] top-[21px]" data-name="Attach Progress">
          {bannerPhase === "attached" ? (
            <p
              className="absolute z-[7] font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[152px] not-italic text-[#c0c0c0] text-[14px] top-[21px] whitespace-pre"
              data-tauri-drag-region
            >{`-  [Attached!]`}</p>
          ) : (
            <p
              className="absolute z-[7] font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[152px] not-italic text-[#c0c0c0] text-[14px] top-[21px] whitespace-nowrap"
              data-tauri-drag-region
            >
              <span>{`-  [Attaching`}</span>
              <span className="inline-block min-w-[1.1em] text-left">{attachEllipsis}</span>
              <span>{`]`}</span>
            </p>
          )}
        </div>
      ) : null}

      {/* Exit + minimize — anchored top-right with fixed pixel offsets so the SVG stays the
          same physical size when the window grows (the old %-based inset scaled with the
          window and looked oversized in resizable mode). */}
      <div className="absolute right-[6px] top-[4px] z-[10] h-[13px] w-[33px]" data-og-live="iconColor">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 13">
          <g>
            <path d="M11 12H1" stroke="white" strokeLinecap="butt" strokeLinejoin="miter" strokeWidth="2" />
            <path d="M32 1L21 12M32 12L21 1" stroke="white" strokeLinecap="butt" strokeWidth="2" />
          </g>
        </svg>
        <button
          type="button"
          aria-label="Minimize"
          className="absolute left-0 top-0 h-full w-[40%] cursor-default border-0 bg-transparent p-0 outline-none focus:outline-none focus-visible:outline-none"
          onClick={onMinimize}
        />
        <button
          type="button"
          aria-label="Close"
          className="absolute right-0 top-0 h-full w-[55%] cursor-default border-0 bg-transparent p-0 outline-none focus:outline-none focus-visible:outline-none"
          onClick={onClose}
        />
      </div>

      {/* Script list (right) — same `editor-sidebar-scripts` workspace list as the default UI sidebar.
          Anchored to the right edge with a fixed width so it stays glued to the right when resized. */}
      <div
        className="absolute z-[7] overflow-hidden"
        style={{
          right: SCRIPT_LIST_RIGHT,
          top: SCRIPT_LIST_TOP,
          bottom: EDITOR_BOTTOM,
          width: scriptListW,
          backgroundColor: "var(--og-panel-bg, #282828)",
        }}
        data-og-live="panelBg"
      >
        {enhancedScriptList ? (
          <EditorScriptListPanel
            variant="og"
            className="h-full min-h-0"
            width={scriptListW}
            scripts={editorSidebarScripts}
            autoexecuteScripts={autoexecuteScripts}
            bridgeConnected={bridge.connected}
            executeIconColor={ogTheme.text}
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
        <div className="shell-script-browser-scroll relative z-[1] box-border flex h-full min-h-0 flex-col gap-px overflow-y-auto overflow-x-hidden px-1 py-1">
          {editorSidebarScripts.length === 0 ? (
            <p className="px-0.5 py-1 font-['Inter',sans-serif] text-[9px] leading-snug text-[#a3a3a3]">
              Add <span className="font-mono text-[8px]">.lua</span> files to{" "}
              <span className="font-mono text-[8px]">scripts</span>.
            </p>
          ) : null}
          {editorSidebarScripts.map((script) => (
            <ContextMenu key={script.id}>
              <ContextMenuTrigger asChild>
                <button
                  type="button"
                  title={script.title}
                  className="og-script-item relative shrink-0 w-full whitespace-normal break-words py-[2px] text-left font-['Inter',sans-serif] text-[11px] leading-snug outline-none transition-colors"
                  onClick={() => openScriptListInNewEditorTab(script.title, script.content)}
                >
                  <span className="pointer-events-none absolute inset-0 z-0" data-og-live="listHoverBg" aria-hidden />
                  <span
                    className="relative z-[1] block"
                    style={{ color: "var(--og-list-text, #c0c0c0)" }}
                    data-og-live="listText"
                  >
                    {script.title}
                  </span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="z-[220] min-w-[180px] rounded-none border border-[#3a3a3a] bg-[#2d2d2d] p-0.5 text-white shadow-md">
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
        </div>
        )}
      </div>

      {/* Bottom button row — flex with weighted basis = original Figma widths, so each button
          keeps its proportional share of any gained width. Visual order left-to-right matches
          the original positions: Execute(116) Clear(116) Open File(116) Attach(116) Script Hub(144) Settings(184). */}
      <div
        className="absolute z-[7] flex flex-row"
        style={{
          left: BOTTOM_BUTTONS_LEFT,
          right: BOTTOM_BUTTONS_RIGHT,
          bottom: BOTTOM_BUTTONS_BOTTOM,
          height: BOTTOM_BUTTONS_H,
          gap: BOTTOM_BUTTONS_GAP,
        }}
      >
        <MainChromeButton flexBasis={116} ariaLabel="Execute" onClick={() => void onExecute()}>
          Execute
        </MainChromeButton>
        <MainChromeButton flexBasis={116} ariaLabel="Clear" onClick={onClear}>
          Clear
        </MainChromeButton>
        <MainChromeButton flexBasis={116} ariaLabel="Open File" onClick={onOpenFile}>
          Open File
        </MainChromeButton>
        <MainChromeButton flexBasis={116} ariaLabel="Attach" onClick={onAttachClick}>
          Attach
        </MainChromeButton>
        <MainChromeButton flexBasis={144} ariaLabel="Script Hub" onClick={openScriptHub}>
          Script Hub
        </MainChromeButton>
        <MainChromeButton flexBasis={184} ariaLabel="Settings and Clients" onClick={openSettings}>
          <span className="block max-w-full whitespace-normal break-words">Settings &amp; Clients</span>
        </MainChromeButton>
      </div>

      {/* Editor frame — fills the area between top bar / tab strip and the bottom button row,
          and between the left edge and the right script list. */}
      <div
        className="absolute z-[5]"
        style={{
          left: EDITOR_LEFT,
          top: EDITOR_TOP,
          right: editorRight,
          bottom: EDITOR_BOTTOM,
          backgroundColor: "var(--og-window-bg, #232323)",
        }}
      />
      <div
        className="absolute z-[6] box-border overflow-hidden outline-none"
        style={{
          left: EDITOR_LEFT,
          top: EDITOR_TOP,
          right: editorRight,
          bottom: EDITOR_BOTTOM,
          backgroundColor: "var(--og-editor-bg, #1e1e1e)",
        }}
        data-og-live="editorBg"
      >
        <ScriptMonacoEditor
          value={activeTab.content}
          onChange={updateActiveContent}
          themeId={editorTheme}
        />
      </div>

      {/* Tab strip — same horizontal extent as the editor so it widens with the window. */}
      <div
        className="absolute z-[8] flex flex-row items-center justify-between gap-1"
        style={{
          left: EDITOR_LEFT,
          right: editorRight,
          top: TAB_STRIP_TOP,
          height: TAB_STRIP_H,
          backgroundColor: "var(--og-window-bg, #232323)",
        }}
        data-og-live="windowBg"
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
                  renaming ? "max-w-[min(340px,calc(100%-24px))]" : "max-w-[min(260px,calc(100%-24px))]"
                }`}
                data-og-live={active ? "tabActiveBg" : "tabBg"}
                style={{
                  borderColor: active ? "var(--og-tab-active-border, #484848)" : "var(--og-tab-border, #3a3a3a)",
                  backgroundColor: active ? "var(--og-tab-active-bg, #3c3c3c)" : "var(--og-tab-bg, #323232)",
                }}
              >
                <span
                  className="absolute bottom-0 left-0 right-0 z-[1] h-[2px]"
                  style={{
                    backgroundColor: active
                      ? "var(--og-tab-active-border, #484848)"
                      : "var(--og-tab-border, #3a3a3a)",
                  }}
                  data-og-live={active ? "tabActiveBorder" : "tabBorder"}
                  aria-hidden
                />
                {renaming ? (
                  <input
                    type="text"
                    autoFocus
                    className="box-border min-h-0 min-w-0 flex-1 px-1 font-['Inter',sans-serif] text-[10px] leading-[12px] outline-none"
                    style={{ backgroundColor: "var(--og-button-bg, #2d2d2d)", color: "var(--og-tab-text, #c0c0c0)" }}
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
                    <span className="block min-w-0 truncate pt-[1px] font-['Inter',sans-serif] text-[10px] leading-[12px]" style={{ color: "var(--og-tab-text, #c0c0c0)" }} data-og-live="tabText">
                      {tab.title}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="flex h-full w-[14px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => closeTabHandler(tab.id, e)}
                >
                  <svg className="block size-[9px]" fill="none" viewBox="0 0 9 9" data-og-live="iconColor">
                    <path d="M8 1L1 8M8 8L1 1" stroke="var(--og-icon-color, #C0C0C0)" strokeLinecap="butt" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            );
          })}
          </div>
          {tabScrollHints.canLeft ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-7 items-center justify-start">
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#232323] from-[18%] via-[#232323]/85 via-45% to-transparent"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => scrollTabStrip(-1)}
                className="og-chrome-btn pointer-events-auto relative ml-px flex h-[13px] w-[18px] shrink-0 items-center justify-center rounded-r-[2px] border border-solid shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
                style={{ borderColor: "var(--og-button-border, #2d2d2d)", backgroundColor: "var(--og-button-bg, #272727)", color: "var(--og-text, #ffffff)" }}
                data-og-live="buttonBg"
                aria-label="Scroll tabs left"
              >
                <ChevronLeft className="size-[12px] opacity-95" strokeWidth={2.25} aria-hidden data-og-live="iconColor" />
              </button>
            </div>
          ) : null}
          {tabScrollHints.canRight ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-end">
              <div
                className="absolute inset-0 bg-gradient-to-l from-[#232323] from-[18%] via-[#232323]/85 via-45% to-transparent"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => scrollTabStrip(1)}
                className="og-chrome-btn pointer-events-auto relative mr-px flex h-[13px] w-[18px] shrink-0 items-center justify-center rounded-l-[2px] border border-solid shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
                style={{ borderColor: "var(--og-button-border, #2d2d2d)", backgroundColor: "var(--og-button-bg, #272727)", color: "var(--og-text, #ffffff)" }}
                data-og-live="buttonBg"
                aria-label="Scroll tabs right"
              >
                <ChevronRight className="size-[12px] opacity-95" strokeWidth={2.25} aria-hidden data-og-live="iconColor" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-row items-center" style={{ gap: 2 }}>
          <button
            type="button"
            aria-label="Save script as"
            title="Save current tab"
            className="relative size-[15px] shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[#a8a8a8] hover:text-[#e8e8e8] active:text-white"
            onClick={onSaveTab}
          >
            <svg className="block size-full" fill="none" viewBox="0 0 15 15" aria-hidden>
              <rect fill="var(--og-tab-active-bg, #3C3C3C)" height="14" stroke="var(--og-tab-active-border, #484848)" width="14" x="0.5" y="0.5" />
              <path
                d="M4 3.5h4.5L10.5 5.5v6H4v-8z"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="miter"
              />
              <path d="M5.2 3.5V5.8h2.5V3.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="miter" />
              <path d="M5 8.5h5v2.5H5V8.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="miter" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Add script tab"
            className="relative size-[15px] shrink-0 cursor-pointer border-0 bg-transparent p-0"
            onClick={addTab}
          >
            <svg className="block size-full" fill="none" viewBox="0 0 15 15">
              <g>
                <rect fill="var(--og-tab-active-bg, #3C3C3C)" height="14" stroke="var(--og-tab-active-border, #484848)" width="14" x="0.5" y="0.5" />
                <path d="M7.5 3L7.5 12M12 7.5L3 7.5" stroke="var(--og-icon-color, #C0C0C0)" strokeLinecap="butt" strokeWidth="2" />
              </g>
            </svg>
          </button>
        </div>
      </div>

      {showAddGistPopup ? (
        <AddGistUrlDialog
          variant="og"
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
