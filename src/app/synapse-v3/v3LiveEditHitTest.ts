import { createLiveEditHitResolver } from "@/app/liveEdit/liveEditHitTest";
import { getLiveEditPathFromElement, type V3LiveEditPath } from "./v3LiveEditRegistry";

export type LiveEditHit = {
  element: HTMLElement | SVGElement;
  path: V3LiveEditPath;
};

const resolveV3LiveEditTargetAt = createLiveEditHitResolver({
  liveAttr: "data-v3-live",
  fallbackAttr: "data-v3-live-fallback",
  popoverSelector: "[data-live-edit-popover]",
  getPathFromElement: getLiveEditPathFromElement,
});

export function resolveLiveEditTargetAt(clientX: number, clientY: number): LiveEditHit | null {
  return resolveV3LiveEditTargetAt(clientX, clientY);
}
