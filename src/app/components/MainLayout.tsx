import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import svgPaths from "../../imports/svg-puhpyzdadw";
import { cn } from "./ui/utils";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "../../branding";
import {
  contrastInk,
  contrastInkAverage,
  hasActiveBackgroundMedia,
  loadBackgroundImageObjectUrl,
  loadBackgroundVideoObjectUrl,
  readShellTheme,
  revokeBackgroundVideoObjectUrl,
  SHELL_THEME_CHANGED_EVENT,
  withAlpha,
  backgroundMediaFilter,
  integratedRouteColumnStyle,
  type ShellHoverRoutePath,
  type ShellThemeState,
} from "../../ui/shellTheme";
import {
  readShellThemeUiLiveEdit,
  writeShellThemeUiLiveEdit,
  SHELL_LIVE_EDIT_CHANGED_EVENT,
} from "../../ui/shellThemeUi";
import { CROSS_WINDOW_STORAGE_KEYS, listenCrossWindowStorage } from "../crossWindowSync";
import { GradientLiveEditHitZones } from "../liveEdit/GradientLiveEditHitZones";
import { ShellLiveEditProvider } from "../../ui/ShellLiveEditContext";
import TopBarBrandMark from "./TopBarBrandMark";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "../../ui/shellChromeGeometry";
import {
  SIDEBAR_NAV_CELL_H,
  sidebarNavActivePillPath,
  sidebarNavPillBox,
  sidebarNavRoundedRectPath,
} from "../../ui/sidebarNavShape";
import {
  attachOverlayEnter,
  hoverContentDim,
  hoverPanelMove,
  hoverPanelShell,
  hoverTextCrossfade,
  mainShellFade,
  mainShellFadeInstant,
  pageRouteEnterFade,
  pageRouteExitFade,
} from "../../ui/motion";
import AttachProgress from "./AttachProgress";
import InitializationScreen from "./InitializationScreen";
import { ShellFitLine } from "./ShellFitLine";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readAppSettings, shouldApplyEdgeCurve, APP_SETTINGS_CHANGED_EVENT } from "../appSettings";
import { readInitScreenCompleted, writeInitScreenCompleted } from "../initScreenStorage";
import { centerWindowOnCurrentMonitor } from "../windowPlacement";
import { applyShellWindowMinSize, dblClickMaximizeIfResizable } from "../windowConstraints";
import { scheduleLaunchAlwaysOnTopRefresh, syncCurrentWindowAlwaysOnTop } from "../synapse-original/lib/alwaysOnTop";
import { ShellChromeProvider } from "../shellChromeContext";
import { isTauriApp } from "../tauriEnv";
import { EditorWorkspaceProvider } from "../editorWorkspace/EditorWorkspaceContext";
import { ExecutorBridgeProvider, useExecutorBridge } from "../executorBridge/ExecutorBridgeContext";
import MacSploitNotification from "./MacSploitNotification";

const SIDEBAR_NAV_CELL_COUNT = 5;

const SIDEBAR_NAV_ITEMS: {
  route: string;
  paths: readonly string[];
}[] = [
  { route: "/", paths: [svgPaths.p1c8e86a0] },
  { route: "/script-hub", paths: [svgPaths.p303efb80] },
  { route: "/console", paths: [svgPaths.p365b7ea0, "M22.5 22L13 32L22 41.5"] },
  { route: "/settings", paths: [svgPaths.p3b75e740] },
  { route: "/themes", paths: [svgPaths.p3e88dd80] },
];

/** Aligns the hover tooltip vertically with the nav row (legacy offset from 64px cells + default gap). */
function hoverPanelTopForRow(cellTop: number): number {
  return cellTop + 55;
}

function hoverLines(tooltip: { descriptionLine1: string; descriptionLine2: string }): string[] {
  const lines = [tooltip.descriptionLine1, tooltip.descriptionLine2].filter((s) => s.trim().length > 0);
  return lines.length ? lines : [""];
}

function ShellBackgroundMedia({
  theme,
  videoUrl,
  imageUrl,
  letterboxBg,
}: {
  theme: ShellThemeState;
  videoUrl: string | null;
  imageUrl: string | null;
  letterboxBg: string;
}) {
  const { x, y } = theme.backgroundPosition;
  const objectPosition = `${x}% ${y}%`;
  const imageSrc = theme.backgroundImageDataUrl ?? imageUrl;
  const mediaFilter = backgroundMediaFilter(theme);
  const mediaFilterStyle = mediaFilter ? ({ filter: mediaFilter } as const) : undefined;

  if (theme.backgroundMode === "image" && imageSrc) {
    return (
      <div
        className="absolute inset-0 overflow-hidden bg-black pointer-events-none"
        style={{ backgroundColor: letterboxBg }}
      >
        <div className="h-full w-full" style={mediaFilterStyle}>
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
          />
        </div>
      </div>
    );
  }

  if (theme.backgroundMode === "video" && videoUrl) {
    return (
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ backgroundColor: letterboxBg }}
      >
        <div className="h-full w-full" style={mediaFilterStyle}>
          <video
            src={videoUrl}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            muted
            loop
            autoPlay
            playsInline
          />
        </div>
      </div>
    );
  }

  return null;
}

function MainLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showInit, setShowInit] = useState(() => !readInitScreenCompleted());
  const [isAttaching, setIsAttaching] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [theme, setTheme] = useState(readShellTheme);
  const [liveEditEnabled, setLiveEditEnabled] = useState(readShellThemeUiLiveEdit);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  /** Set in handleInitComplete; first main paint skips shell fade + route enter; cleared after layout */
  const handoffFromInitRef = useRef(false);
  const didStartupAutoAttachRef = useRef(false);
  const { armAfterAttachAnimation, markAttachClicked, connected, attachArmed } = useExecutorBridge();

  const [settings, setSettings] = useState(readAppSettings);
  useEffect(() => {
    const onSettings = () => setSettings(readAppSettings());
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
    const offStorage = listenCrossWindowStorage([CROSS_WINDOW_STORAGE_KEYS.appSettings], onSettings);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, onSettings);
      offStorage();
    };
  }, []);

  useLayoutEffect(() => {
    if (!showInit && handoffFromInitRef.current) {
      handoffFromInitRef.current = false;
    }
  }, [showInit]);

  useLayoutEffect(() => {
    if (showInit || !isTauriApp()) return;
    void syncCurrentWindowAlwaysOnTop();
    scheduleLaunchAlwaysOnTopRefresh();
    void (async () => {
      const settings = readAppSettings();
      try {
        await getCurrentWindow().setResizable(settings.resizableWindow);
      } catch { /* ignore */ }
      try {
        await applyShellWindowMinSize(settings.resizableWindow);
      } catch { /* ignore */ }
      try {
        await centerWindowOnCurrentMonitor();
      } catch { /* ignore */ }
    })();
  }, [showInit]);

  useEffect(() => {
    const syncLiveEdit = () => setLiveEditEnabled(readShellThemeUiLiveEdit());
    window.addEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
    const offStorage = listenCrossWindowStorage([CROSS_WINDOW_STORAGE_KEYS.shellLiveEditUi], syncLiveEdit);
    return () => {
      window.removeEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, syncLiveEdit);
      offStorage();
    };
  }, []);

  useEffect(() => {
    const onTheme = () => setTheme(readShellTheme());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, onTheme);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, onTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme();
      if (t.backgroundMode === "video" && t.hasStoredVideo) {
        const url = await loadBackgroundVideoObjectUrl();
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (videoObjectUrlRef.current) {
          revokeBackgroundVideoObjectUrl(videoObjectUrlRef.current);
        }
        videoObjectUrlRef.current = url;
        setVideoObjectUrl(url);
      } else {
        if (videoObjectUrlRef.current) {
          revokeBackgroundVideoObjectUrl(videoObjectUrlRef.current);
        }
        videoObjectUrlRef.current = null;
        setVideoObjectUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [theme.backgroundMode, theme.hasStoredVideo, theme.backgroundVideoFilename]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme();
      if (t.backgroundMode === "image" && t.hasStoredBackgroundImage) {
        const url = await loadBackgroundImageObjectUrl();
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (imageObjectUrlRef.current) {
          revokeBackgroundVideoObjectUrl(imageObjectUrlRef.current);
        }
        imageObjectUrlRef.current = url;
        setImageObjectUrl(url);
      } else {
        if (imageObjectUrlRef.current) {
          revokeBackgroundVideoObjectUrl(imageObjectUrlRef.current);
        }
        imageObjectUrlRef.current = null;
        setImageObjectUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    theme.backgroundMode,
    theme.hasStoredBackgroundImage,
    theme.backgroundImageFilename,
    theme.backgroundImageDataUrl,
  ]);

  useEffect(
    () => () => {
      if (videoObjectUrlRef.current) {
        revokeBackgroundVideoObjectUrl(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      if (imageObjectUrlRef.current) {
        revokeBackgroundVideoObjectUrl(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
    },
    [],
  );

  const routeVariants = useMemo(
    () => ({
      off: { opacity: 0 },
      on: {
        opacity: 1,
        transition: handoffFromInitRef.current ? { duration: 0 } : pageRouteEnterFade,
      },
      leave: {
        opacity: 0,
        transition: pageRouteExitFade,
      },
    }),
    [location.pathname],
  );

  const handleInitComplete = () => {
    writeInitScreenCompleted();
    handoffFromInitRef.current = true;
    setShowInit(false);
  };

  const handleAttachComplete = () => {
    setIsAttaching(false);
    armAfterAttachAnimation();
  };

  useEffect(() => {
    if (showInit || didStartupAutoAttachRef.current) return;
    if (!readAppSettings().autoAttach) return;
    if (!connected) return;
    if (attachArmed) {
      didStartupAutoAttachRef.current = true;
      return;
    }
    didStartupAutoAttachRef.current = true;
    markAttachClicked();
    setIsAttaching(true);
  }, [showInit, connected, attachArmed, markAttachClicked]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F9") return;
      e.preventDefault();
      navigate(location.pathname === "/console" ? "/" : "/console");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, location.pathname]);

  const isHovering = hoveredPath !== null;
  const sidebarNavRowStepPx = SIDEBAR_NAV_CELL_H + theme.sidebarNavCellGapPx;
  const hoveredSidebarNavTopPx =
    hoveredPath != null
      ? Math.max(0, SIDEBAR_NAV_ITEMS.findIndex((x) => x.route === hoveredPath)) * sidebarNavRowStepPx
      : 0;
  const mediaActive = hasActiveBackgroundMedia(theme, videoObjectUrl, imageObjectUrl);
  const aboveFilm = mediaActive && theme.backgroundLayer === "above";
  /** Full-shell media under chrome; page column stays transparent so routes show it through. */
  const shellIntegratedMedia = mediaActive && theme.backgroundLayer === "integrated";
  /** Wallpaper is visible through top bar and sidebar whenever Integrated + media is active. */
  const translucentChrome = shellIntegratedMedia;
  const hasPageBackground = shellIntegratedMedia;

  /** When the page column is transparent over integrated shell media, route copy reads against shell bg, not pageAreaBg. */
  const resolvedRouteBackground = hasPageBackground ? theme.shellBg : theme.pageAreaBg;
  const routeChromeForeground = contrastInk(resolvedRouteBackground);
  const topBarIconFg = contrastInkAverage(theme.topBarFrom, theme.topBarTo);
  const tooltipFg = contrastInkAverage(theme.shellHoverPanelFrom, theme.shellHoverPanelTo);

  /** Options sidebar cell stays highlighted while the integrated webpage route is open. */
  const sidebarRouteIsActive = (route: string) =>
    location.pathname === route ||
    (route === "/settings" && location.pathname === "/integrated-webpage");

  const sidebarNavIconStroke = (route: string) => {
    if (hoveredPath === route) return theme.sidebarIconStrokeHover;
    return sidebarRouteIsActive(route)
      ? theme.sidebarIconStrokeActive
      : theme.sidebarIconStrokeInactive;
  };

  const sidebarNavCellFill = (route: string, isActive: boolean) => {
    if (isActive) return theme.sidebarNavActiveBg;
    if (hoveredPath === route) return theme.sidebarNavHoverBg;
    return theme.sidebarNavButtonRadiusPx > 0 ? theme.sidebarBg : theme.sidebarNavInactiveBg;
  };

  /** Integrated background: chrome reads slightly more through the wallpaper than solid shell (overlay/“above” unchanged). */
  const integratedChromeBlend = shellIntegratedMedia ? 0.92 : 1;

  const topBarGradient = translucentChrome
    ? `linear-gradient(to bottom, ${withAlpha(theme.topBarFrom, 0.9 * integratedChromeBlend)}, ${withAlpha(theme.topBarTo, 0.9 * integratedChromeBlend)})`
    : shellIntegratedMedia
      ? `linear-gradient(to bottom, ${withAlpha(theme.topBarFrom, integratedChromeBlend)}, ${withAlpha(theme.topBarTo, integratedChromeBlend)})`
      : `linear-gradient(to bottom, ${theme.topBarFrom}, ${theme.topBarTo})`;

  const topBarLogoSrc = useMemo(
    () => resolveTopBarLogoUrl(theme),
    [theme.logoDataUrl, theme.topBarLogoPreset],
  );

  /** Icon mark is nearly square; a wide strip makes `object-contain` tiny — use a square frame. */
  const topBarLogoIconMark =
    !theme.logoDataUrl && isTopBarIconMarkPreset(theme.topBarLogoPreset);

  const sidebarBgStyle = translucentChrome
    ? withAlpha(theme.sidebarBg, 0.88 * integratedChromeBlend)
    : shellIntegratedMedia
      ? withAlpha(theme.sidebarBg, integratedChromeBlend)
      : theme.sidebarBg;

  const shellChromeValue = useMemo(
    () => ({
      shellTheme: theme,
      hasPageBackground,
      pageAreaBg: theme.pageAreaBg,
      resolvedRouteBackground,
      routeChromeForeground,
    }),
    [theme, hasPageBackground, resolvedRouteBackground, routeChromeForeground],
  );

  const skipMainShellFade = handoffFromInitRef.current;
  const tauri = isTauriApp();

  const applyCurve = shouldApplyEdgeCurve(settings);
  const cornerRadius = applyCurve ? (theme.windowCornerRadiusPx || 7) : 0;

  /* When the edge curve is enabled, the outer wrapper MUST be transparent —
   * otherwise the rounded inner motion.div's corner cutouts show the
   * wrapper's opaque shellBg and the curve isn't visible at all (the
   * "sticking out parts" the user sees are the wrapper's square corners
   * peeking out past the rounded inner element). With curve off the
   * wrapper keeps shellBg so the window paints a solid square. */
  const outerBg = applyCurve ? "transparent" : theme.shellBg;

  return (
    <ShellLiveEditProvider
      enabled={liveEditEnabled}
      onEnabledChange={(on) => {
        setLiveEditEnabled(on);
        writeShellThemeUiLiveEdit(on);
      }}
    >
      {showInit ? (
        <InitializationScreen onComplete={handleInitComplete} />
      ) : (
    <div
      className={
        tauri
          ? "fixed inset-0 z-0 flex min-h-0 w-full flex-col"
          : "fixed inset-0 z-0 flex items-center justify-center bg-black"
      }
      style={tauri ? { backgroundColor: outerBg } : undefined}
      data-shell-live-fallback="shellBg"
    >
      <motion.div
        className={
          tauri
            ? cn(
                "relative h-full min-h-0 w-full flex-1 select-none",
                applyCurve ? "border border-[#414342] border-solid" : "border-none"
              )
            : "relative select-none shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        }
        style={
          tauri
            ? {
                backgroundColor: theme.shellBg,
                borderRadius: cornerRadius,
                overflow: "hidden",
              }
            : {
                backgroundColor: theme.shellBg,
                width: SHELL_CHROME_WIDTH,
                height: SHELL_CHROME_HEIGHT,
                borderRadius: theme.windowCornerRadiusPx,
                overflow: "hidden",
              }
        }
        initial={{ opacity: skipMainShellFade ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={skipMainShellFade ? mainShellFadeInstant : mainShellFade}
        data-shell-live="shellBg"
      >
        <ShellChromeProvider value={shellChromeValue}>
          {shellIntegratedMedia && (
            <div
              className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
              style={{ opacity: theme.backgroundOpacity }}
            >
              <ShellBackgroundMedia
                theme={theme}
                videoUrl={videoObjectUrl}
                imageUrl={imageObjectUrl}
                letterboxBg={theme.shellBg}
              />
            </div>
          )}

          <div
            className="absolute inset-0 z-[25]"
            style={
              {
                "--sidebar-nav-hover": theme.sidebarNavHoverBg,
                "--shell-hover-from": theme.shellHoverPanelFrom,
                "--shell-hover-to": theme.shellHoverPanelTo,
                "--route-fg": routeChromeForeground,
                "--topbar-icon-fg": topBarIconFg,
              } as CSSProperties
            }
          >
          {/* Top Bar — Tauri: full-area drag layer under logo; gradient/logo pointer-events-none so hits reach drag */}
          <div className="relative left-0 top-0 z-[3] h-[55px] w-full overflow-visible">
            <div
              className="pointer-events-none absolute inset-0 shadow-[0px_8px_15.9px_0px_rgba(0,0,0,0.15)]"
              style={{ background: topBarGradient }}
            />
            <GradientLiveEditHitZones
              enabled={liveEditEnabled}
              fromPath="topBarFrom"
              toPath="topBarTo"
              className="absolute inset-x-0 z-[2]"
            />

            {tauri ? (
              <div
                className={cn(
                  "absolute inset-0 z-[1]",
                  liveEditEnabled && "pointer-events-none",
                )}
                data-tauri-drag-region
                aria-hidden
                onDoubleClick={() => void dblClickMaximizeIfResizable()}
              />
            ) : null}

            {liveEditEnabled ? (
              <span
                className="pointer-events-none absolute left-[190px] top-[18px] z-[4] rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
                style={{ background: "#2563a8", color: "#fff" }}
              >
                LIVE EDIT
              </span>
            ) : null}

            <div
              className={cn(
                "pointer-events-none absolute left-[11px] z-[2] select-none",
                topBarLogoIconMark
                  ? "top-[5px] h-[46px] w-[46px]"
                  : "top-[9px] h-[37px] w-[175px]",
              )}
            >
              <TopBarBrandMark
                mode={theme.logoMode}
                imageSrc={topBarLogoSrc}
                iconMark={topBarLogoIconMark && theme.logoMode === "image"}
                textLogo={{
                  text: theme.logoText,
                  color: theme.logoTextColor,
                  fontId: theme.logoTextFontId,
                  sizePx: theme.logoTextSizePx,
                  weight: theme.logoTextWeight,
                  letterSpacing: theme.logoTextLetterSpacing,
                }}
                alt="Synapse"
                className="h-full w-full object-contain object-left"
              />
            </div>

            {/* Same layout as pre-Tauri centered shell: right-[5px] top-[9px], 30×9, viewBox 32×11. */}
            <div className="absolute right-[5px] top-[9px] z-[4] h-[9px] w-[30px]">
              <div className="relative h-full w-full">
                <svg className="pointer-events-none h-full w-full" fill="none" viewBox="0 0 32 11" aria-hidden>
                  <path
                    d={svgPaths.p38ec4f00}
                    stroke={topBarIconFg}
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M6 10.0001L1 10.0001"
                    stroke={topBarIconFg}
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                </svg>
                {tauri ? (
                  <>
                    <button
                      type="button"
                      className="absolute inset-y-0 left-0 z-[1] w-1/2 cursor-default border-0 bg-transparent p-0 outline-none"
                      data-tauri-no-drag
                      aria-label="Minimize"
                      onClick={() => void getCurrentWindow().minimize()}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 z-[1] w-1/2 cursor-default border-0 bg-transparent p-0 outline-none"
                      data-tauri-no-drag
                      aria-label="Close"
                      onClick={() => void getCurrentWindow().close()}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div
            className="absolute bottom-0 left-0 top-[55px] z-[3] w-[60px] shadow-[4px_0px_4.2px_0px_rgba(0,0,0,0.06)] transition-colors duration-200"
            style={{ backgroundColor: sidebarBgStyle }}
            data-shell-live="sidebarBg"
          >
            {SIDEBAR_NAV_ITEMS.map((item, cellIndex) => {
              const cellTop = cellIndex * sidebarNavRowStepPx;
              const isActive = sidebarRouteIsActive(item.route);
              const rx = theme.sidebarNavButtonRadiusPx;
              const spread = theme.sidebarNavNotchSpreadPx;
              const nt = cellIndex > 0 ? theme.sidebarNavNotchTopPx : 0;
              const nb = cellIndex < SIDEBAR_NAV_CELL_COUNT - 1 ? theme.sidebarNavNotchBottomPx : 0;
              const box = sidebarNavPillBox(
                theme.sidebarNavPillInsetHorizontalPx,
                theme.sidebarNavPillInsetVerticalPx,
              );
              const fill = sidebarNavCellFill(item.route, isActive);
              const strokeCol = sidebarNavIconStroke(item.route);
              const sw = theme.sidebarNavIconStrokeWidthPx;
              const navLivePath = isActive
                ? "sidebarNavActiveBg"
                : hoveredPath === item.route
                  ? "sidebarNavHoverBg"
                  : "sidebarNavInactiveBg";
              let bgD: string;
              if (rx <= 0) {
                bgD = "";
              } else if (isActive) {
                bgD = sidebarNavActivePillPath(
                  box.x,
                  box.y,
                  box.w,
                  box.h,
                  rx,
                  nt,
                  nb,
                  spread,
                  spread,
                  theme.sidebarNavTrailingNotchPx,
                  theme.sidebarNavTrailingNotchSpanPx,
                );
              } else {
                bgD = sidebarNavRoundedRectPath(box.x, box.y, box.w, box.h, rx);
              }
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigate(item.route)}
                  onMouseEnter={() => setHoveredPath(item.route)}
                  onMouseLeave={() => setHoveredPath(null)}
                  className="absolute left-0 w-[60px] h-[64px] border-0 bg-transparent p-0"
                  style={{ top: cellTop }}
                >
                  <svg className="h-full w-full" fill="none" viewBox="0 0 60 64">
                    {rx <= 0 ? (
                      <rect width="60" height="64" fill={fill} data-shell-live={navLivePath} />
                    ) : (
                      <path d={bgD} fill={fill} data-shell-live={navLivePath} />
                    )}
                    {item.paths.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        stroke={strokeCol}
                        strokeLinecap="round"
                        strokeWidth={sw}
                      />
                    ))}
                  </svg>
                </button>
              );
            })}
          </div>

          <motion.div
            className="absolute z-[3] left-[60px] top-[55px] right-0 bottom-0 overflow-hidden"
            style={{
              ...integratedRouteColumnStyle(theme, hasPageBackground),
            }}
            data-shell-live="pageAreaBg"
            animate={{
              opacity: liveEditEnabled
                ? 1
                : hasPageBackground && isHovering
                  ? 1
                  : isHovering
                    ? 0.36
                    : 1,
            }}
            transition={hoverContentDim}
          >
            <EditorWorkspaceProvider>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  className="relative z-[1] h-full w-full"
                  style={{ color: "var(--route-fg)" }}
                  variants={routeVariants}
                  initial={handoffFromInitRef.current ? false : "off"}
                  animate="on"
                  exit="leave"
                >
                  <div
                    className="flex h-full min-h-0 w-full flex-col"
                    style={{
                      opacity: hasPageBackground ? theme.integratedPageChrome.pageRouteSurfacesOpacity : 1,
                    }}
                  >
                    <Suspense fallback={null}>
                      <Outlet context={{ setIsAttaching }} />
                    </Suspense>
                  </div>
                </motion.div>
              </AnimatePresence>
            </EditorWorkspaceProvider>
          </motion.div>
          </div>

          {aboveFilm && (
            <div
              className="pointer-events-none absolute inset-0 z-[30] overflow-hidden"
              style={{ opacity: theme.backgroundOpacity }}
              aria-hidden
            >
              <ShellBackgroundMedia
                theme={theme}
                videoUrl={videoObjectUrl}
                imageUrl={imageObjectUrl}
                letterboxBg={theme.shellBg}
              />
            </div>
          )}

          <AnimatePresence>
            {hoveredPath && (
              <motion.div
                key="hover-description-shell"
                data-shell-text-no-step
                className="pointer-events-none absolute left-[67px] z-[40] min-h-[56px] w-[231px] overflow-visible"
                style={{ color: tooltipFg, overflow: "visible" }}
                initial={{ opacity: 0, x: -14, top: hoverPanelTopForRow(hoveredSidebarNavTopPx) }}
                animate={{ opacity: 1, x: 0, top: hoverPanelTopForRow(hoveredSidebarNavTopPx) }}
                exit={{ opacity: 0, x: -14 }}
                transition={{
                  top: hoverPanelMove,
                  opacity: hoverPanelShell,
                  x: hoverPanelShell,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 min-h-[56px] rounded-[3px]"
                  style={{
                    background: `linear-gradient(to bottom, ${theme.shellHoverPanelFrom}, ${theme.shellHoverPanelTo})`,
                  }}
                />
                <GradientLiveEditHitZones
                  enabled={liveEditEnabled}
                  fromPath="shellHoverPanelFrom"
                  toPath="shellHoverPanelTo"
                  className="absolute inset-x-0 z-[2]"
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={hoveredPath}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={hoverTextCrossfade}
                    className="relative z-[1] flex min-h-[56px] min-w-0 flex-col px-[6px] pb-[6px] pt-[3px]"
                  >
                    <p className="min-w-0 shrink-0 font-black leading-[normal]">
                      <ShellFitLine basePx={13} fitOptions={{ minPx: 5 }}>
                        {theme.shellHoverTooltips[hoveredPath as ShellHoverRoutePath].title}
                      </ShellFitLine>
                    </p>
                    <div className="mt-[2px] min-w-0 font-semibold leading-[1.4]">
                      {hoverLines(theme.shellHoverTooltips[hoveredPath as ShellHoverRoutePath]).map(
                        (line, i) => (
                          <p key={i} className="m-0 min-w-0 leading-[1.4]">
                            <ShellFitLine basePx={10} fitOptions={{ minPx: 4 }}>
                              {line}
                            </ShellFitLine>
                          </p>
                        ),
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isAttaching && (
              <motion.div
                key="attach-progress"
                className="absolute left-0 top-0 z-[120] w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={attachOverlayEnter}
              >
                <AttachProgress onComplete={handleAttachComplete} />
              </motion.div>
            )}
          </AnimatePresence>
          <MacSploitNotification />
        </ShellChromeProvider>
      </motion.div>
    </div>
      )}
    </ShellLiveEditProvider>
  );
}

export default function MainLayout() {
  return (
    <ExecutorBridgeProvider>
      <MainLayoutInner />
    </ExecutorBridgeProvider>
  );
}
