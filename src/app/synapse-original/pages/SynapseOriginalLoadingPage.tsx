import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import synapseLogo from "@/assets/synapse-original/synapse-logo.png?url";
import { useEllipsisCycle } from "@/app/synapse-original/lib/useEllipsisCycle";
import { SYNAPSE_ORIGINAL_SIZES, setMainWindowSize } from "@/app/synapse-original/windowOps";
import { useOgTheme } from "@/app/synapse-original/ogTheme";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";

/** Total time loading UI is shown before navigating to /synapse-original/main (ms). */
const LOADING_DURATION_MS = 2000;
const BAR_MAX_PX = 237;

/**
 * Synapse Original loading screen — pixel-accurate port of the Figma `LoadingScreen` mockup
 * (265x171). Drives the host window down to that size, runs a fake-progress bar for
 * `LOADING_DURATION_MS`, then morphs the window up to 838x372 and navigates to
 * `/synapse-original/main`.
 *
 * Dev-only "F" hotkey freezes the bar so layout / IPC can be inspected without timing.
 */
export default function SynapseOriginalLoadingPage() {
  const navigate = useNavigate();
  const ogTheme = useOgTheme();
  const [barPx, setBarPx] = useState(0);
  const [pausedForTest, setPausedForTest] = useState(false);
  const [stage, setStage] = useState<"in" | "out">("in");
  const totalPausedMsRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseWallRef = useRef<number | null>(null);
  const ellipsis = useEllipsisCycle(!pausedForTest, 500);

  useEffect(() => {
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      try {
        await getCurrentWindow().setMinSize(null);
      } catch { /* ignore */ }
      const { width, height } = SYNAPSE_ORIGINAL_SIZES.loading;
      await setMainWindowSize(width, height);
      try {
        await centerWindowOnCurrentMonitor();
      } catch {
        /* ignore; non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const wall = performance.now();
      if (!pausedRef.current) {
        pausedRef.current = true;
        pauseWallRef.current = wall;
        setPausedForTest(true);
      } else {
        if (pauseWallRef.current != null) {
          totalPausedMsRef.current += wall - pauseWallRef.current;
        }
        pausedRef.current = false;
        pauseWallRef.current = null;
        setPausedForTest(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t0 = performance.now();
    let bar = 0;
    let finished = false;
    let iv: ReturnType<typeof setTimeout> | undefined;

    const goMain = () => {
      setStage("out");
      setTimeout(() => {
        navigate("/synapse-original/main", { replace: true });
      }, 500);
    };

    const effectiveElapsed = () => {
      const wall = performance.now();
      if (pausedRef.current && pauseWallRef.current != null) {
        return pauseWallRef.current - t0 - totalPausedMsRef.current;
      }
      return wall - t0 - totalPausedMsRef.current;
    };

    const scheduleNext = () => {
      if (finished) return;
      const delay = pausedRef.current ? 100 : 82 + Math.floor(Math.random() * 28);
      iv = window.setTimeout(() => {
        if (finished) return;
        if (pausedRef.current) {
          scheduleNext();
          return;
        }
        const elapsed = effectiveElapsed();
        const gate = (elapsed / LOADING_DURATION_MS) * BAR_MAX_PX;
        bar += 4.5 + Math.random() * 7;
        if (Math.random() < 0.06) {
          bar -= 2 + Math.random() * 6;
        }
        bar = Math.max(0, Math.min(BAR_MAX_PX, bar, gate + 16));
        
        if (elapsed >= LOADING_DURATION_MS && bar >= BAR_MAX_PX) {
          finished = true;
          if (iv !== undefined) window.clearTimeout(iv);
          setBarPx(BAR_MAX_PX);
          goMain();
          return;
        }
        
        setBarPx(Math.round(bar));
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      finished = true;
      if (iv !== undefined) window.clearTimeout(iv);
    };
  }, [navigate]);

  const progressPx = Math.min(BAR_MAX_PX, barPx);

  return (
    <div 
      className="relative overflow-hidden transition-opacity duration-500 ease-in-out" 
      style={{ width: 265, height: 171, opacity: stage === "in" ? 1 : 0 }} 
      data-name="loading screen"
    >
      <div
        className="absolute h-[171px] left-0 top-0 w-[265px]"
        style={{ backgroundColor: "var(--og-window-bg, #232323)" }}
        data-name="Loading Screen Window"
        data-tauri-drag-region
      />
      <div
        className="absolute flex h-[48px] left-[17px] top-[37px] w-[231px] items-center justify-start overflow-hidden"
        style={{ backgroundColor: "var(--og-window-bg, #232323)" }}
        data-name="Synapse Logo"
        data-tauri-drag-region
      >
        <img
          alt=""
          className="pointer-events-none max-h-full max-w-full object-contain object-left"
          src={ogTheme.logoDataUrl ?? synapseLogo}
        />
      </div>
      <div
        className="absolute bg-white border border-[#878788] border-solid h-[23px] left-[14px] top-[117px] w-[237px]"
        data-name="Progress Bar"
      />
      <div
        className="absolute bg-[#008b00] border border-[#539b59] border-solid h-[23px] left-[14px] top-[117px] will-change-[width]"
        style={{ width: progressPx, transition: "width 0.14s ease-out" }}
        data-name="Progress"
      />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[normal] left-[85px] not-italic text-[#c0c0c0] text-[16px] top-[145px] whitespace-nowrap">
        {import.meta.env.DEV && pausedForTest ? (
          <span>{`[ Paused — F ]`}</span>
        ) : (
          <>
            <span>{`[ Loading`}</span>
            <span className="inline-block min-w-[1.1em] text-left">{ellipsis}</span>
            <span>{` ]`}</span>
          </>
        )}
      </p>
    </div>
  );
}
