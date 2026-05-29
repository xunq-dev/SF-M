import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import svgPaths from "../../imports/svg-ylg03bb51c";
import { isTopBarIconMarkPreset, resolveTopBarLogoUrl } from "../../branding";
import { initBarProgressEased, initCircleFill, initStepFromBar } from "../../ui/progressVisual";
import {
  loadInitBackgroundImageObjectUrl,
  loadInitVideoObjectUrl,
  readShellTheme,
  revokeBackgroundVideoObjectUrl,
  SHELL_THEME_CHANGED_EVENT,
  type InitScreenThemeState,
} from "../../ui/shellTheme";
import { contentCrossfade, initPanelSlide } from "../../ui/motion";
import { cn } from "./ui/utils";
import { ShellFitBlock } from "./ShellFitBlock";
import { ShellFitLine } from "./ShellFitLine";

const PREVIEW_BAR_MS = 4800;
/** Exact half-scale keeps layout on whole pixels and reduces blur from fractional transforms */
const PREVIEW_SCALE = 0.5;
const INIT_SHELL_W = 290;
const INIT_SHELL_H = 355;
const PREVIEW_FRAME_W = INIT_SHELL_W * PREVIEW_SCALE;
const PREVIEW_FRAME_H = Math.ceil(INIT_SHELL_H * PREVIEW_SCALE);
const PREVIEW_PAD = 6;
const HEADER_H = 128;
const INIT_HEADER_VIEWBOX = "16.3 5.3 290 128" as const;

function PreviewBg({
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

/**
 * Scaled live mock of the initialization shell for the Theme Control Panel.
 */
export default function InitScreenThemePreview({ 
  theme: customInitTheme,
  shell = "default",
}: { 
  theme?: InitScreenThemeState;
  shell?: "default" | "synapseOriginal" | "synapseX";
}) {
  const svgIds = useId().replace(/:/g, "");
  const [initTheme, setInitTheme] = useState<InitScreenThemeState>(() => {
    if (customInitTheme) return customInitTheme;
    const t = readShellTheme();
    return shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
  });
  const [logoSrc, setLogoSrc] = useState(() => resolveTopBarLogoUrl(readShellTheme()));
  const [logoSlot, setLogoSlot] = useState(() => {
    const t = readShellTheme();
    return { dataUrl: t.logoDataUrl, preset: t.topBarLogoPreset };
  });
  const [barProgress, setBarProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imageRef = useRef<string | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const initLoadingSlides = useMemo(
    () =>
      initTheme.loadingSteps.map((s) => ({
        title: s.title,
        descriptionText: [s.descriptionLine1, s.descriptionLine2].filter((x) => x.trim()).join(" "),
      })),
    [initTheme.loadingSteps],
  );

  useEffect(() => {
    if (customInitTheme) {
      setInitTheme(customInitTheme);
      return;
    }
    const sync = () => {
      const t = readShellTheme();
      const sub = shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
      setInitTheme(sub);
      setLogoSrc(resolveTopBarLogoUrl(t));
      setLogoSlot({ dataUrl: t.logoDataUrl, preset: t.topBarLogoPreset });
    };
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
  }, [customInitTheme, shell]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme();
      const sub = shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
      if (sub.backgroundMode === "video" && sub.hasStoredVideo) {
        const url = await loadInitVideoObjectUrl(shell);
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (videoRef.current) revokeBackgroundVideoObjectUrl(videoRef.current);
        videoRef.current = url;
        setVideoUrl(url);
      } else {
        if (videoRef.current) revokeBackgroundVideoObjectUrl(videoRef.current);
        videoRef.current = null;
        setVideoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    shell,
    initTheme.backgroundMode,
    initTheme.hasStoredVideo,
    initTheme.backgroundVideoFilename,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = readShellTheme();
      const sub = shell === "synapseOriginal" ? t.initThemeSynapseOriginal : shell === "synapseX" ? t.initThemeSynapseX : t.initTheme;
      if (sub.backgroundMode === "image" && sub.hasStoredBackgroundImage) {
        const url = await loadInitBackgroundImageObjectUrl(shell);
        if (cancelled) {
          revokeBackgroundVideoObjectUrl(url);
          return;
        }
        if (imageRef.current) revokeBackgroundVideoObjectUrl(imageRef.current);
        imageRef.current = url;
        setImageUrl(url);
      } else {
        if (imageRef.current) revokeBackgroundVideoObjectUrl(imageRef.current);
        imageRef.current = null;
        setImageUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    shell,
    initTheme.backgroundMode,
    initTheme.hasStoredBackgroundImage,
    initTheme.backgroundImageFilename,
    initTheme.backgroundImageDataUrl,
  ]);

  useEffect(
    () => () => {
      if (videoRef.current) {
        revokeBackgroundVideoObjectUrl(videoRef.current);
        videoRef.current = null;
      }
      if (imageRef.current) {
        revokeBackgroundVideoObjectUrl(imageRef.current);
        imageRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % PREVIEW_BAR_MS;
      const t = elapsed / PREVIEW_BAR_MS;
      const eased = initBarProgressEased(t);
      const el = barFillRef.current;
      if (el) el.style.transform = `scaleY(${Math.max(eased, 0.001)})`;
      setBarProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const currentStep = initStepFromBar(barProgress);
  const gradId = `paint_preview_${svgIds}`;
  const filterId = `filter_preview_${svgIds}`;
  const previewIconMark = !logoSlot.dataUrl && isTopBarIconMarkPreset(logoSlot.preset);
  const previewIconMarkShift = previewIconMark ? 68 : 0;
  const outerW = PREVIEW_FRAME_W + PREVIEW_PAD * 2;
  const outerH = PREVIEW_FRAME_H + PREVIEW_PAD * 2;

  return (
    <div className="inline-flex max-w-full flex-col gap-1.5">
      <p className="m-0 text-[0.6875rem] text-white">Live preview</p>
      <div
        className="box-border overflow-hidden rounded-sm border border-[#464646] bg-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.35)]"
        style={{ width: outerW, height: outerH, padding: PREVIEW_PAD }}
      >
        <div
          className="overflow-hidden bg-[#0f0f0f]"
          style={{ width: PREVIEW_FRAME_W, height: PREVIEW_FRAME_H }}
        >
          <div
            className="transform-gpu will-change-transform antialiased [backface-visibility:hidden]"
            style={{
              width: INIT_SHELL_W,
              height: INIT_SHELL_H,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "0 0",
            }}
          >
          <div
            className="relative overflow-hidden rounded-sm shadow-md"
            style={{
              width: INIT_SHELL_W,
              height: INIT_SHELL_H,
              backgroundColor: initTheme.shellBg,
            }}
          >
            <PreviewBg
              init={initTheme}
              videoUrl={videoUrl}
              imageUrl={imageUrl}
              shellBg={initTheme.shellBg}
            />

            <div
              className="absolute inset-x-0 top-0 z-[1] overflow-visible"
              style={{ height: HEADER_H, width: "100%" }}
            >
              <svg
                className="block size-full"
                fill="none"
                overflow="visible"
                preserveAspectRatio="none"
                viewBox={INIT_HEADER_VIEWBOX}
              >
                <g filter={`url(#${filterId})`}>
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
                  "absolute left-[10px]",
                  previewIconMark ? "top-[8px] h-[112px] w-[112px]" : "top-[10px] h-[43px] w-[208px]",
                )}
              >
                <img
                  key={logoSrc}
                  alt=""
                  className="h-full w-full object-contain object-left"
                  src={logoSrc}
                  width={800}
                  height={167}
                  decoding="async"
                />
              </div>
              <p
                className="absolute left-[10px] right-[10px] min-w-0 font-normal leading-[normal]"
                style={{ color: initTheme.textPrimary, top: 58 + previewIconMarkShift }}
              >
                <ShellFitLine basePx={20} fitOptions={{ minPx: 5 }}>
                  Let&apos;s get scripting.
                </ShellFitLine>
              </p>
            </div>

            <p
              className="absolute left-[10px] right-[10px] z-[2] min-w-0 font-normal leading-[normal]"
              style={{ color: initTheme.textPrimary, top: 119 + previewIconMarkShift }}
            >
              <ShellFitLine basePx={18} fitOptions={{ minPx: 5 }}>
                Initializing...
              </ShellFitLine>
            </p>
            <p
              className="absolute left-[10px] right-[10px] z-[2] min-w-0 font-normal leading-[normal]"
              style={{ color: initTheme.textSecondary, top: 137 + previewIconMarkShift }}
            >
              <ShellFitLine basePx={13} fitOptions={{ minPx: 5 }}>
                This won&apos;t take long.
              </ShellFitLine>
            </p>

            <div
              className="absolute left-[8px] z-[2] h-[175px] w-[20px]"
              style={{ top: 163 + previewIconMarkShift }}
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
                />
              </div>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="absolute left-0 w-[20px] h-[20px]"
                  style={{ top: `${index * 51}px` }}
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

            {currentStep < initLoadingSlides.length && (
              <motion.div
                className="absolute left-[36px] z-[2] h-[56px] w-[231px] overflow-hidden"
                style={{ top: 163 + previewIconMarkShift }}
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
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
