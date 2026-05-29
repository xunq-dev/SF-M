import { useState, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { attachOverlayEnter, contentCrossfade, initPanelSlide } from "../../ui/motion";
import { GradientLiveEditHitZones } from "../liveEdit/GradientLiveEditHitZones";
import { useShellLiveEdit } from "../../ui/ShellLiveEditContext";
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
import { ShellFitLine } from "./ShellFitLine";

/** Notch width matches overlay; bottom corners rounded via path */
const NOTCH_W = 550;
const NOTCH_H = 40;
const NOTCH_BOTTOM_R = 5;

/** Progress row: end circles cap the bar; track only between them */
const DOT = 16;
const ROW_W = 538;
const TRACK_LEFT = DOT / 2;
const TRACK_W = ROW_W - DOT;

interface AttachProgressProps {
  onComplete: () => void;
}

/** Text card x offsets: left → center (calc 50%−90px) → right */
const ATTACH_CARD_X = [-132, 0, 132] as const;

function readAttachOverlayTheme(): AttachOverlayThemeState {
  return readShellTheme().attachOverlayTheme;
}

export default function AttachProgress({ onComplete }: AttachProgressProps) {
  const gradId = useId().replace(/:/g, "");
  const { enabled: liveEditEnabled } = useShellLiveEdit();
  const [overlay, setOverlay] = useState<AttachOverlayThemeState>(readAttachOverlayTheme);
  const [barProgress, setBarProgress] = useState(0);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completeFiredRef = useRef(false);
  onCompleteRef.current = onComplete;

  const barMs = overlay.barDurationMs;

  useEffect(() => {
    const on = () => setOverlay(readAttachOverlayTheme());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, on);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, on);
  }, []);

  const currentStep = attachStepFromBar(barProgress);
  const dotColors = {
    inactive: overlay.dotInactive,
    active: overlay.dotActive,
    complete: overlay.dotComplete,
  };

  useEffect(() => {
    if (barProgress < 1 || completeFiredRef.current) return;
    completeFiredRef.current = true;
    const id = window.setTimeout(() => onCompleteRef.current(), 260);
    return () => clearTimeout(id);
  }, [barProgress]);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const raw = (now - start) / barMs;
      const t = Math.min(raw, 1);
      const eased = attachBarProgressEased(t);
      const el = barFillRef.current;
      if (el) {
        el.style.transform = `scaleX(${Math.max(eased, 0.001)})`;
      }
      setBarProgress(t);
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        /* One extra frame at t=1 so the eased curve settles visually before we stop. */
        rafRef.current = requestAnimationFrame(() => {
          const el2 = barFillRef.current;
          if (el2) el2.style.transform = "scaleX(1)";
          setBarProgress(1);
          rafRef.current = null;
        });
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [barMs]);

  const step = overlay.steps[currentStep];

  return (
    <div data-shell-text-no-step className="absolute left-0 top-0 w-full">
      <motion.div
        className="absolute left-1/2 top-0 h-[40px] w-[550px] -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={attachOverlayEnter}
      >
        <div className="absolute inset-0 overflow-hidden">
          <GradientLiveEditHitZones
            enabled={liveEditEnabled}
            fromPath="attachOverlayTheme.notchFrom"
            toPath="attachOverlayTheme.notchTo"
            className="absolute inset-x-0 z-[2]"
          />
          <svg className="h-full w-full" viewBox={`0 0 ${NOTCH_W} ${NOTCH_H}`} fill="none">
            <defs>
              <linearGradient id={`attachBg-${gradId}`} x1="275" y1="0" x2="275" y2="40">
                <stop stopColor={overlay.notchFrom} />
                <stop offset="1" stopColor={overlay.notchTo} />
              </linearGradient>
            </defs>
            <path
              fill={`url(#attachBg-${gradId})`}
              d={`M 0 0 H ${NOTCH_W} V ${NOTCH_H - NOTCH_BOTTOM_R} A ${NOTCH_BOTTOM_R} ${NOTCH_BOTTOM_R} 0 0 1 ${NOTCH_W - NOTCH_BOTTOM_R} ${NOTCH_H} H ${NOTCH_BOTTOM_R} A ${NOTCH_BOTTOM_R} ${NOTCH_BOTTOM_R} 0 0 1 0 ${NOTCH_H - NOTCH_BOTTOM_R} V 0 Z`}
            />
          </svg>
        </div>

        <p className="absolute left-[6px] top-[4px] z-10 text-[10px] font-semibold text-white">
          Attach Progress
        </p>

        <div
          className="absolute left-[6px] top-[20px] h-[16px]"
          style={{ width: ROW_W }}
        >
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
              data-shell-live="attachOverlayTheme.barFill"
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
      </motion.div>

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
  );
}
