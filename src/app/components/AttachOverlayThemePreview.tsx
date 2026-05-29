import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  attachBarProgressEased,
  attachCircleFill,
  attachStepFromBar,
} from "../../ui/progressVisual";
import {
  readShellTheme,
  SHELL_THEME_CHANGED_EVENT,
  type AttachOverlayThemeState,
} from "../../ui/shellTheme";
import { contentCrossfade, initPanelSlide } from "../../ui/motion";
import { SHELL_CHROME_WIDTH } from "../../ui/shellChromeGeometry";
import { ShellFitLine } from "./ShellFitLine";

const NOTCH_W = 550;
const NOTCH_H = 40;
const NOTCH_BOTTOM_R = 5;
const DOT = 16;
const ROW_W = 538;
const TRACK_LEFT = DOT / 2;
const TRACK_W = ROW_W - DOT;
const ATTACH_CARD_X = [-132, 0, 132] as const;

/** Editor content width the real overlay is laid out against */
const INNER_W = SHELL_CHROME_WIDTH;
const INNER_H = 100;
const PREVIEW_SCALE = 0.5;
const PREVIEW_FRAME_W = INNER_W * PREVIEW_SCALE;
const PREVIEW_FRAME_H = Math.ceil(INNER_H * PREVIEW_SCALE);
const PREVIEW_PAD = 6;

function readAttachOverlay(): AttachOverlayThemeState {
  return readShellTheme().attachOverlayTheme;
}

/**
 * Looped half-scale mock of the attach progress overlay for the Theme panel.
 */
export default function AttachOverlayThemePreview() {
  const gradId = useId().replace(/:/g, "");
  const [overlay, setOverlay] = useState<AttachOverlayThemeState>(readAttachOverlay);
  const [barProgress, setBarProgress] = useState(0);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const barMs = overlay.barDurationMs;

  useEffect(() => {
    const on = () => setOverlay(readAttachOverlay());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, on);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, on);
  }, []);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % barMs;
      const t = elapsed / barMs;
      const eased = attachBarProgressEased(t);
      const el = barFillRef.current;
      if (el) el.style.transform = `scaleX(${Math.max(eased, 0.001)})`;
      setBarProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [barMs]);

  const currentStep = attachStepFromBar(barProgress);
  const dotColors = {
    inactive: overlay.dotInactive,
    active: overlay.dotActive,
    complete: overlay.dotComplete,
  };
  const step = overlay.steps[currentStep];

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
              width: INNER_W,
              height: INNER_H,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "0 0",
            }}
          >
            <div data-shell-text-no-step className="relative h-full w-full">
              <div className="absolute left-1/2 top-0 h-[40px] w-[550px] -translate-x-1/2">
                <div className="absolute inset-0 overflow-hidden">
                  <svg className="h-full w-full" viewBox={`0 0 ${NOTCH_W} ${NOTCH_H}`} fill="none">
                    <defs>
                      <linearGradient id={`attachPreviewBg-${gradId}`} x1="275" y1="0" x2="275" y2="40">
                        <stop stopColor={overlay.notchFrom} />
                        <stop offset="1" stopColor={overlay.notchTo} />
                      </linearGradient>
                    </defs>
                    <path
                      fill={`url(#attachPreviewBg-${gradId})`}
                      d={`M 0 0 H ${NOTCH_W} V ${NOTCH_H - NOTCH_BOTTOM_R} A ${NOTCH_BOTTOM_R} ${NOTCH_BOTTOM_R} 0 0 1 ${NOTCH_W - NOTCH_BOTTOM_R} ${NOTCH_H} H ${NOTCH_BOTTOM_R} A ${NOTCH_BOTTOM_R} ${NOTCH_BOTTOM_R} 0 0 1 0 ${NOTCH_H - NOTCH_BOTTOM_R} V 0 Z`}
                    />
                  </svg>
                </div>

                <p className="absolute left-[6px] top-[4px] z-10 text-[10px] font-semibold text-white">
                  Attach Progress
                </p>

                <div className="absolute left-[6px] top-[20px] h-[16px]" style={{ width: ROW_W }}>
                  <div
                    className="absolute top-[4px] z-0 h-[8px] rounded-full"
                    style={{
                      left: TRACK_LEFT,
                      width: TRACK_W,
                      backgroundColor: overlay.trackFill,
                      opacity: overlay.trackOpacity,
                    }}
                  />
                  <div
                    className="absolute top-[4px] z-[1] h-[8px] overflow-hidden rounded-full"
                    style={{ left: TRACK_LEFT, width: TRACK_W }}
                  >
                    <div
                      ref={barFillRef}
                      className="h-full w-full origin-left will-change-transform"
                      style={{
                        transform: "scaleX(0.001)",
                        backgroundColor: overlay.barFill,
                      }}
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                    const centerX = TRACK_LEFT + (index / 8) * TRACK_W;
                    const left = centerX - DOT / 2;
                    return (
                      <div
                        key={index}
                        className="absolute top-0 z-[2] h-[16px] w-[16px]"
                        style={{ left }}
                      >
                        <svg className="h-full w-full" viewBox="0 0 16 16">
                          <circle
                            cx="8"
                            cy="8"
                            r="7.5"
                            stroke={overlay.dotStroke}
                            strokeWidth="1"
                            fill={attachCircleFill(index, barProgress, dotColors)}
                          />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>

              <motion.div
                className="absolute top-[45px] min-h-[52px] w-[180px] min-w-0 overflow-hidden"
                style={{ left: "calc(50% - 90px)" }}
                animate={{ x: ATTACH_CARD_X[currentStep] }}
                transition={initPanelSlide}
              >
                <div
                  className="absolute inset-0 rounded-[3px]"
                  style={{
                    background: `linear-gradient(to bottom, ${overlay.stepCardFrom}, ${overlay.stepCardTo})`,
                  }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={contentCrossfade}
                    className="absolute inset-0 min-w-0 px-[6px]"
                  >
                    <p
                      className="absolute left-[6px] right-[6px] top-[4px] min-w-0 font-black leading-[normal]"
                      style={{ color: overlay.stepTitleColor }}
                    >
                      <ShellFitLine basePx={12} fitOptions={{ minPx: 6 }}>
                        {step.title}
                      </ShellFitLine>
                    </p>
                    <p
                      className="absolute left-[6px] right-[6px] top-[22px] min-w-0 font-semibold leading-[normal]"
                      style={{ color: overlay.stepBodyColor }}
                    >
                      <ShellFitLine basePx={10} fitOptions={{ minPx: 5 }}>
                        {step.description}
                      </ShellFitLine>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
