export type LiveEditHitTestConfig = {
  liveAttr: string;
  fallbackAttr: string;
  popoverSelector: string;
  getPathFromElement: (el: HTMLElement | SVGElement) => string | null;
};

export type LiveEditHit = {
  element: HTMLElement | SVGElement;
  path: string;
};

type Candidate = {
  el: HTMLElement | SVGElement;
  path: string;
  fallback: boolean;
  stackIndex: number;
};

function elementArea(el: HTMLElement | SVGElement): number {
  const r = el.getBoundingClientRect();
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function isLiveEditElement(el: Element): el is HTMLElement | SVGElement {
  return el instanceof HTMLElement || el instanceof SVGElement;
}

export function createLiveEditHitResolver(config: LiveEditHitTestConfig) {
  function collectCandidates(clientX: number, clientY: number): Candidate[] {
    const stack = document.elementsFromPoint(clientX, clientY);
    const out: Candidate[] = [];

    stack.forEach((el, stackIndex) => {
      if (!isLiveEditElement(el)) return;
      if (el.closest(config.popoverSelector)) return;
      const path = config.getPathFromElement(el);
      if (!path) return;
      out.push({
        el,
        path,
        fallback: el.hasAttribute(config.fallbackAttr),
        stackIndex,
      });
    });

    return out;
  }

  function pickBest(candidates: Candidate[]): LiveEditHit | null {
    const primary = candidates.filter((c) => !c.fallback);
    const pool = primary.length > 0 ? primary : candidates.filter((c) => c.fallback);
    if (pool.length === 0) return null;

    let best = pool[0];
    let bestArea = elementArea(best.el);

    for (let i = 1; i < pool.length; i++) {
      const c = pool[i];
      const area = elementArea(c.el);
      if (area < bestArea - 0.5) {
        best = c;
        bestArea = area;
      } else if (Math.abs(area - bestArea) <= 0.5 && c.stackIndex < best.stackIndex) {
        best = c;
      }
    }

    return { element: best.el, path: best.path };
  }

  return function resolveLiveEditTargetAt(clientX: number, clientY: number): LiveEditHit | null {
    const candidates = collectCandidates(clientX, clientY);
    return pickBest(candidates);
  };
}
