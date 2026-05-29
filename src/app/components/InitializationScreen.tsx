import { useState, useEffect, useRef, useId, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence, animate, useMotionValue } from "motion/react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import svgPaths from "../../imports/svg-ylg03bb51c";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "../../branding";
import TopBarBrandMark from "./TopBarBrandMark";
import {
  initBarProgressEased,
  initCircleFill,
  initStepFromBar,
} from "../../ui/progressVisual";
import {
  loadInitBackgroundImageObjectUrl,
  loadInitVideoObjectUrl,
  readShellTheme,
  revokeBackgroundVideoObjectUrl,
  SHELL_THEME_CHANGED_EVENT,
  type InitScreenThemeState,
} from "../../ui/shellTheme";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "../../ui/shellChromeGeometry";
import {
  contentCrossfade,
  initCardFadeOut,
  initPanelSlide,
  shellResize,
} from "../../ui/motion";
import { readAppSettings } from "../appSettings";
import { centerWindowOnCurrentMonitor, centerWindowOnCursorMonitor } from "../windowPlacement";
import { isTauriApp } from "../tauriEnv";
import { cn } from "./ui/utils";
import { ShellFitBlock } from "./ShellFitBlock";
import { ShellFitLine } from "./ShellFitLine";
import { GradientLiveEditHitZones } from "../liveEdit/GradientLiveEditHitZones";
import { useShellLiveEdit } from "../../ui/ShellLiveEditContext";
import type { Transition } from "motion/react";

const BAR_DURATION_MS = 6000;

const INIT_SHELL_W = 290;
const INIT_SHELL_H = 355;
const HEADER_H = 128;
const INIT_HEADER_VIEWBOX = "16.3 5.3 290 128" as const;

interface InitializationScreenProps {
  onComplete: () => void;
}

type ExitPhase = null | "fade" | "expand";

const introContentFade: Transition = {
  duration: 0.44,
  ease: [0.4, 0, 0.2, 1],
  delay: 0.38,
};

const secondaryIntroFade: Transition = {
  duration: 0.42,
  ease: [0.4, 0, 0.2, 1],
  delay: 0.52,
};

function InitBackgroundMedia({
  init,
  videoUrl,
  imageUrl,
  shellBg,
}: {
  init: InitScreenThemeState;
  videoUrl: string | null;
  imageUrl: string | null;
  shellBg: string;
}) {
  const { x, y } = init.backgroundPosition;
  const objectPosition = `${x}% ${y}%`;
  const imageSrc = init.backgroundImageDataUrl ?? imageUrl;

  if (init.backgroundMode === "image" && imageSrc) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: shellBg, opacity: init.backgroundOpacity }}
      >
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition }}
        />
      </div>
    );
  }

  if (init.backgroundMode === "video" && videoUrl) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: shellBg, opacity: init.backgroundOpacity }}
      >
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
    );
  }

  return null;
}

export default function InitializationScreen({ onComplete }: InitializationScreenProps) {
  const svgIds = useId().replace(/:/g, "");
  const { enabled: liveEditEnabled } = useShellLiveEdit();
  const [showContent, setShowContent] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);
  const [exitPhase, setExitPhase] = useState<ExitPhase>(null);
  const [barProgress, setBarProgress] = useState(0);
  const [initTheme, setInitTheme] = useState<InitScreenThemeState>(() => readShellTheme().initTheme);
  const [logoSrc, setLogoSrc] = useState(() => resolveTopBarLogoUrl(readShellTheme()));
  const [logoSlot, setLogoSlot] = useState(() => {
    const t = readShellTheme();
    return {
      dataUrl: t.logoDataUrl,
      preset: t.topBarLogoPreset,
      mode: t.logoMode,
      text: t.logoText,
      textColor: t.logoTextColor,
      fontId: t.logoTextFontId,
      sizePx: t.logoTextSizePx,
      weight: t.logoTextWeight,
      letterSpacing: t.logoTextLetterSpacing,
    };
  });
  const [windowCornerRadiusPx, setWindowCornerRadiusPx] = useState(
    () => readShellTheme().windowCornerRadiusPx,
  );
  const [initVideoUrl, setInitVideoUrl] = useState<string | null>(null);
  const initVideoUrlRef = useRef<string | null>(null);
  const [initImageUrl, setInitImageUrl] = useState<string | null>(null);
  const initImageUrlRef = useRef<string | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Init shell size — same easing as CSS morph; Tauri window tracks these via setSize. */
  const morphW = useMotionValue(INIT_SHELL_W);
  const morphH = useMotionValue(INIT_SHELL_H);
  const morphStartedRef = useRef(false);

  const initLoadingSlides = useMemo(
    () =>
      initTheme.loadingSteps.map((s) => ({
        title: s.title,
        descriptionText: [s.descriptionLine1, s.descriptionLine2].filter((x) => x.trim()).join(" "),
      })),
    [initTheme.loadingSteps],
  );

  useEffect(() => {
    const sync = () => {
      const t = readShellTheme();
      setInitTheme(t.initTheme);
      setLogoSrc(resolveTopBarLogoUrl(t));
      setLogoSlot({
        dataUrl: t.logoDataUrl,
        preset: t.topBarLogoPreset,
        mode: t.logoMode,
        text: t.logoText,
        textColor: t.logoTextColor,
        fontId: t.logoTextFontId,
        sizePx: t.logoTextSizePx,
        weight: t.logoTextWeight,
        letterSpacing: t.logoTextLetterSpacing,
      });
      setWindowCornerRadiusPx(t.windowCornerRadiusPx);
    };
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme().initTheme;
      if (t.backgroundMode === "video" && t.hasStoredVideo) {
        const url = await loadInitVideoObjectUrl();
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (initVideoUrlRef.current) revokeBackgroundVideoObjectUrl(initVideoUrlRef.current);
        initVideoUrlRef.current = url;
        setInitVideoUrl(url);
      } else {
        if (initVideoUrlRef.current) revokeBackgroundVideoObjectUrl(initVideoUrlRef.current);
        initVideoUrlRef.current = null;
        setInitVideoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    initTheme.backgroundMode,
    initTheme.hasStoredVideo,
    initTheme.backgroundVideoFilename,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme().initTheme;
      if (t.backgroundMode === "image" && t.hasStoredBackgroundImage) {
        const url = await loadInitBackgroundImageObjectUrl();
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (initImageUrlRef.current) revokeBackgroundVideoObjectUrl(initImageUrlRef.current);
        initImageUrlRef.current = url;
        setInitImageUrl(url);
      } else {
        if (initImageUrlRef.current) revokeBackgroundVideoObjectUrl(initImageUrlRef.current);
        initImageUrlRef.current = null;
        setInitImageUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    initTheme.backgroundMode,
    initTheme.hasStoredBackgroundImage,
    initTheme.backgroundImageFilename,
    initTheme.backgroundImageDataUrl,
  ]);

  useEffect(
    () => () => {
      if (initVideoUrlRef.current) {
        revokeBackgroundVideoObjectUrl(initVideoUrlRef.current);
        initVideoUrlRef.current = null;
      }
      if (initImageUrlRef.current) {
        revokeBackgroundVideoObjectUrl(initImageUrlRef.current);
        initImageUrlRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    const animTimer = setTimeout(() => {
      setStartAnimation(true);
    }, 800);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(animTimer);
    };
  }, []);

  useEffect(() => {
    if (!startAnimation || barProgress < 1) return;
    const fadeTimer = window.setTimeout(() => setExitPhase("fade"), 420);
    return () => clearTimeout(fadeTimer);
  }, [startAnimation, barProgress]);

  useEffect(() => {
    if (exitPhase !== "fade") return;
    const id = window.setTimeout(() => setExitPhase("expand"), 520);
    return () => clearTimeout(id);
  }, [exitPhase]);

  useEffect(() => {
    if (exitPhase !== "expand") return;
    const id = window.setTimeout(() => {
      if (isTauriApp()) {
        void getCurrentWindow().setResizable(readAppSettings().resizableWindow);
      }
      onComplete();
    }, 660);
    return () => clearTimeout(id);
  }, [exitPhase, onComplete]);

  useEffect(() => {
    if (!startAnimation) return;
    void import("../pages/EditorPage");
  }, [startAnimation]);

  /** Borderless init card; lock resize until intro handoff; z-order follow Settings (desktop only). */
  useLayoutEffect(() => {
    if (!isTauriApp()) return;
    const win = getCurrentWindow();
    const prefs = readAppSettings();
    void win.setResizable(false);
    if (prefs.alwaysOnTop) {
      void win.setAlwaysOnBottom(false);
    }
    void win.setAlwaysOnTop(prefs.alwaysOnTop);
    void win.setMinSize(null).then(() =>
      win.setSize(new LogicalSize(INIT_SHELL_W, INIT_SHELL_H)).then(() => win.center())
    );
  }, []);

  /**
   * Resize tracks morph; center after size keeps growth from the screen middle.
   * Throttle to one setSize+center per animation frame to avoid WebView2 white flicker
   * from overlapping async resizes.
   */
  useEffect(() => {
    if (!isTauriApp()) return;
    const win = getCurrentWindow();
    let raf = 0;
    let lastW = -1;
    let lastH = -1;

    const flush = () => {
      raf = 0;
      const nw = Math.round(morphW.get());
      const nh = Math.round(morphH.get());
      if (nw === lastW && nh === lastH) return;
      lastW = nw;
      lastH = nh;
      void win.setSize(new LogicalSize(nw, nh)).then(() => centerWindowOnCurrentMonitor());
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(flush);
    };

    const u1 = morphW.on("change", schedule);
    const u2 = morphH.on("change", schedule);
    flush();
    return () => {
      cancelAnimationFrame(raf);
      u1();
      u2();
    };
  }, [morphW, morphH]);

  useEffect(() => {
    if (exitPhase !== "expand") return;
    if (morphStartedRef.current) return;
    morphStartedRef.current = true;
    void animate(morphW, SHELL_CHROME_WIDTH, shellResize);
    void animate(morphH, SHELL_CHROME_HEIGHT, shellResize);
    if (!isTauriApp()) return;
    /** Defensive final commit: if WebView2 drops a per-frame setSize during the morph,
     * the canonical chrome size still lands before `onComplete` (660ms timer above). */
    const finalCommit = window.setTimeout(() => {
      void getCurrentWindow()
        .setSize(new LogicalSize(SHELL_CHROME_WIDTH, SHELL_CHROME_HEIGHT))
        .then(() => centerWindowOnCurrentMonitor());
    }, 620);
    return () => window.clearTimeout(finalCommit);
  }, [exitPhase, morphW, morphH]);

  useEffect(() => {
    if (!startAnimation) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / BAR_DURATION_MS, 1);
      const eased = initBarProgressEased(t);
      const el = barFillRef.current;
      if (el) {
        el.style.transform = `scaleY(${Math.max(eased, 0.001)})`;
      }
      setBarProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startAnimation]);

  const shellStyle = { backgroundColor: initTheme.shellBg };
  const currentStep = startAnimation ? initStepFromBar(barProgress) : 0;
  const gradId = `paint0_linear_${svgIds}`;
  const filterId = `filter0_d_${svgIds}`;
  /** Square icon mark needs a tighter frame than the wide wordmark strip (2× default icon size). */
  const useIconMarkFrame =
    logoSlot.mode === "image" && !logoSlot.dataUrl && isTopBarIconMarkPreset(logoSlot.preset);
  /** Extra vertical offset for copy/progress when the tall icon mark is shown (was 56px → 112px). */
  const iconMarkLayoutShift = useIconMarkFrame ? 68 : 0;
  const tauri = isTauriApp();

  return (
    <div
      className={
        tauri
          ? "fixed inset-0 z-[100] flex h-full min-h-0 w-full items-center justify-center"
          : "fixed inset-0 z-[100] flex items-center justify-center"
      }
      style={{ backgroundColor: initTheme.shellBg }}
    >
      <motion.div
        className={
          tauri
            ? "relative overflow-hidden shadow-none"
            : "relative overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        }
        style={{
          ...shellStyle,
          borderRadius: windowCornerRadiusPx,
          width: morphW,
          height: morphH,
          transformOrigin: "center center",
        }}
      >
        <motion.div
          className="relative h-full w-full"
          initial={{ opacity: 0 }}
          animate={{
            opacity:
              exitPhase === "fade" || exitPhase === "expand"
                ? 0
                : showContent
                  ? 1
                  : 0,
          }}
          transition={
            exitPhase === "fade"
              ? initCardFadeOut
              : exitPhase === "expand"
                ? { duration: 0 }
                : introContentFade
          }
        >
          <InitBackgroundMedia
            init={initTheme}
            videoUrl={initVideoUrl}
            imageUrl={initImageUrl}
            shellBg={initTheme.shellBg}
          />

          <div
            className="absolute inset-x-0 top-0 z-[1] overflow-visible"
            style={{ height: `${HEADER_H}px`, width: "100%" }}
          >
            <GradientLiveEditHitZones
              enabled={liveEditEnabled}
              fromPath="initTheme.headerFrom"
              toPath="initTheme.headerTo"
              className="absolute inset-x-0 z-[2]"
            />
            <svg
              className="block size-full"
              fill="none"
              overflow="visible"
              preserveAspectRatio="none"
              viewBox={INIT_HEADER_VIEWBOX}
            >
              <g filter={`url(#${filterId})`} id="Rectangle_21">
                <path d={svgPaths.p3c8b6700} fill={`url(#${gradId})`} />
              </g>
              <defs>
                <filter
                  colorInterpolationFilters="sRGB"
                  filterUnits="userSpaceOnUse"
                  height="160.6"
                  id={filterId}
                  width="322.6"
                  x="0"
                  y="0"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    result="hardAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                  />
                  <feOffset dy="11" />
                  <feGaussianBlur stdDeviation="8.15" />
                  <feComposite in2="hardAlpha" operator="out" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.41 0" />
                  <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_init" />
                  <feBlend in="SourceGraphic" in2="effect1_dropShadow_init" mode="normal" result="shape" />
                </filter>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={gradId}
                  x1="161.3"
                  x2="161.3"
                  y1="5.3"
                  y2="133.3"
                >
                  <stop stopColor={initTheme.headerFrom} />
                  <stop offset="0.723454" stopColor={initTheme.headerTo} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-[2]">
            <div
              className={cn(
                "absolute left-[10px] select-none",
                useIconMarkFrame
                  ? "top-[8px] h-[112px] w-[112px]"
                  : "top-[10px] h-[43px] w-[208px]",
              )}
            >
              <TopBarBrandMark
                mode={logoSlot.mode}
                imageSrc={logoSrc}
                iconMark={useIconMarkFrame}
                textLogo={{
                  text: logoSlot.text,
                  color: logoSlot.textColor,
                  fontId: logoSlot.fontId,
                  sizePx: logoSlot.sizePx,
                  weight: logoSlot.weight,
                  letterSpacing: logoSlot.letterSpacing,
                }}
                alt="Synapse"
                className="h-full w-full object-contain object-left"
              />
            </div>
            <p
              className="absolute left-[10px] right-[10px] min-w-0 font-normal leading-[normal]"
              style={{ color: initTheme.textPrimary, top: 58 + iconMarkLayoutShift }}
            >
              <ShellFitLine basePx={20} fitOptions={{ minPx: 5 }}>
                Let&apos;s get scripting.
              </ShellFitLine>
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={secondaryIntroFade}
            className="relative z-[2]"
          >
            <p
              className="absolute left-[10px] right-[10px] min-w-0 font-normal leading-[normal]"
              style={{ color: initTheme.textPrimary, top: 119 + iconMarkLayoutShift }}
            >
              <ShellFitLine basePx={18} fitOptions={{ minPx: 5 }}>
                Initializing...
              </ShellFitLine>
            </p>
            <p
              className="absolute left-[10px] right-[10px] min-w-0 font-normal leading-[normal]"
              style={{ color: initTheme.textSecondary, top: 137 + iconMarkLayoutShift }}
            >
              <ShellFitLine basePx={13} fitOptions={{ minPx: 5 }}>
                This won&apos;t take long.
              </ShellFitLine>
            </p>
          </motion.div>

          <div
            className="absolute left-[8px] z-[2] h-[175px] w-[20px]"
            style={{ top: 163 + iconMarkLayoutShift }}
          >
            <div
              className="absolute left-[3px] top-[7px] h-[160px] w-[14px]"
              style={{ backgroundColor: initTheme.progressTrackBackground }}
            />

            <div className="absolute left-[3px] top-[7px] h-[160px] w-[14px] overflow-hidden">
              <div
                ref={barFillRef}
                className="h-full w-full origin-top will-change-transform"
                style={{
                  transform: "scaleY(0.001)",
                  backgroundColor: initTheme.progressBar,
                }}
                data-shell-live="initTheme.progressBar"
              />
            </div>

            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="absolute left-0 w-[20px] h-[20px]"
                style={{
                  top: `${index * 51}px`,
                }}
              >
                <svg className="h-full w-full" viewBox="0 0 20 20">
                  <circle
                    cx="10"
                    cy="10"
                    r="9.5"
                    stroke={initTheme.stepDotStroke}
                    fill={initCircleFill(index, barProgress, {
                      inactive: initTheme.stepDotInactive,
                      active: initTheme.stepDotActive,
                    })}
                  />
                </svg>
              </div>
            ))}
          </div>

          {startAnimation && currentStep < initLoadingSlides.length && (
            <motion.div
              className="absolute left-[36px] z-[2] h-[56px] w-[231px] overflow-hidden"
              style={{ top: 163 + iconMarkLayoutShift }}
              initial={{ y: 0 }}
              animate={{ y: currentStep * 51 }}
              transition={initPanelSlide}
            >
              <div
                className="absolute inset-0 rounded-[3px]"
                style={{
                  background: `linear-gradient(to bottom, ${initTheme.stepPanelFrom}, ${initTheme.stepPanelTo})`,
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={contentCrossfade}
                  className="absolute inset-0 min-w-0"
                >
                  <p
                    className="absolute left-[6px] right-[6px] top-[3px] min-w-0 font-black leading-[normal]"
                    style={{ color: initTheme.textPrimary }}
                  >
                    <ShellFitLine basePx={13} fitOptions={{ minPx: 5 }}>
                      {initLoadingSlides[currentStep].title}
                    </ShellFitLine>
                  </p>
                  <div
                    className="absolute left-[6px] right-[6px] top-[20px] bottom-[4px] m-0 min-h-0 min-w-0 overflow-hidden font-semibold"
                    style={{ color: initTheme.textSecondary }}
                  >
                    <ShellFitBlock
                      basePx={9}
                      className="h-full"
                      fitOptions={{ minPx: 4, lineHeight: 1.2 }}
                    >
                      {initLoadingSlides[currentStep].descriptionText}
                    </ShellFitBlock>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
