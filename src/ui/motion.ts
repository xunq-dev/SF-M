import type { Transition } from "motion/react";

const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const opacityFade: Transition = {
  duration: 0.3,
  ease: easeInOut,
};

export const opacityFadeFast: Transition = {
  duration: 0.2,
  ease: easeInOut,
};

type Bezier = [number, number, number, number];

/** Sidebar route change: incoming pane only — ease-out opacity 0→1 (no ease-in-out) */
export const pageRouteEnterFade: Transition = {
  duration: 0.34,
  ease: [0, 0, 0.22, 1] as Bezier,
};

/** Outgoing route: no fade-out animation — only the next page fades in from nothing */
export const pageRouteExitFade: Transition = {
  duration: 0,
};

/** Sidebar hover tooltip shell — a bit slower than opacityFadeFast */
export const hoverPanelShell: Transition = {
  duration: 0.36,
  ease: [0.25, 0, 0.2, 1],
};

/** Tooltip vertical move when target changes */
export const hoverPanelMove: Transition = {
  duration: 0.4,
  ease: [0.25, 0, 0.2, 1],
};

/** Main content dim while a nav tooltip is shown */
export const hoverContentDim: Transition = {
  duration: 0.38,
  ease: [0.25, 0, 0.2, 1],
};

/** Same as opacityFade with stagger delay (seconds, Motion convention). */
export function opacityFadeDelayed(delay: number): Transition {
  return { ...opacityFade, delay };
}

export const contentCrossfade: Transition = {
  duration: 0.28,
  ease: easeInOut,
};

/** Nav tooltip copy swap — slightly slower than contentCrossfade */
export const hoverTextCrossfade: Transition = {
  duration: 0.32,
  ease: [0.25, 0, 0.2, 1],
};

/** Vertical sliding panel (init loading steps) */
export const initPanelSlide: Transition = {
  duration: 0.55,
  ease: easeInOut,
};

/** Shell resize (init → full width) */
export const shellResize: Transition = {
  duration: 0.58,
  ease: easeInOut,
};

/** Init content fades out before shell morph (handoff prep) */
export const initCardFadeOut: Transition = {
  duration: 0.48,
  ease: easeInOut,
};

/** Main window first paint after init — long, gentle rise (post-morph handoff) */
export const mainShellFade: Transition = {
  duration: 1.45,
  ease: [0.12, 0, 0.08, 1],
};

/** Skip opacity fade when morphing straight from InitializationScreen */
export const mainShellFadeInstant: Transition = {
  duration: 0,
};

/** Attach overlay + bar drop-in */
export const attachOverlayEnter: Transition = {
  duration: 0.3,
  ease: easeInOut,
};

/** Horizontal follow (legacy / fine-grained UI); attach card uses initPanelSlide */
export const attachFollow: Transition = {
  duration: 0.1,
  ease: "linear",
};
