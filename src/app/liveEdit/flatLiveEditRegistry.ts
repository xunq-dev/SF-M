import type { LiveEditColorFormat } from "./liveEditColorUtils";

export type FlatLiveEditTargetMeta = {
  label: string;
  format: LiveEditColorFormat;
};

export function createFlatLiveEditRegistry<T extends Record<string, string>>(
  registry: Record<keyof T & string, FlatLiveEditTargetMeta>,
) {
  type Path = keyof T & string;

  function isPath(path: string): path is Path {
    return path in registry;
  }

  function getPathFromElement(el: HTMLElement | SVGElement): Path | null {
    const path = el.dataset.live ?? el.dataset.liveFallback;
    if (!path || !isPath(path)) return null;
    return path;
  }

  function getTargetMeta(path: string): FlatLiveEditTargetMeta | null {
    if (!isPath(path)) return null;
    return registry[path];
  }

  function getColorAtPath(theme: T, path: string): string | null {
    if (!isPath(path)) return null;
    const value = theme[path];
    return typeof value === "string" ? value : null;
  }

  function patchColorAtPath(path: string, value: string): Partial<T> | null {
    if (!isPath(path)) return null;
    return { [path]: value } as Partial<T>;
  }

  return {
    registry,
    isPath,
    getPathFromElement,
    getTargetMeta,
    getColorAtPath,
    patchColorAtPath,
  };
}
