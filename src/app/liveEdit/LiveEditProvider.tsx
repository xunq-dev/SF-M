import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LiveEditPopover } from "./LiveEditPopover";
import { LiveEditHoverPreview } from "./LiveEditHoverPreview";
import type { LiveEditColorFormat } from "./liveEditColorUtils";

export type LiveEditTargetMeta = {
  label: string;
  format: LiveEditColorFormat;
};

export type LiveEditProviderConfig<TTheme> = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  theme: TTheme;
  resolveTargetAt: (clientX: number, clientY: number) => { path: string } | null;
  getTargetMeta: (path: string) => LiveEditTargetMeta | null;
  getColorAtPath: (theme: TTheme, path: string) => string | null;
  patchColorAtPath: (path: string, value: string) => unknown | null;
  writeTheme: (partial: unknown) => void;
  onColorCommitted?: (path: string, value: string) => void;
  popoverAttr?: string;
  popoverSelector?: string;
  hoverPreview?: {
    bodyClass?: string;
    outlineColor?: string;
    pillBg?: string;
    pillText?: string;
    persistLastTarget?: boolean;
  };
  onDisabled?: () => void;
};

type LiveEditContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const LiveEditContext = createContext<LiveEditContextValue | null>(null);

export { LiveEditContext };

export function useLiveEdit(): LiveEditContextValue {
  const ctx = useContext(LiveEditContext);
  if (!ctx) {
    return { enabled: false, setEnabled: () => {} };
  }
  return ctx;
}

type PopoverState = { x: number; y: number; path: string } | null;

export function LiveEditProvider<TTheme>({
  enabled,
  onEnabledChange,
  theme,
  resolveTargetAt,
  getTargetMeta,
  getColorAtPath,
  patchColorAtPath,
  writeTheme,
  onColorCommitted,
  popoverAttr = "data-live-edit-popover",
  popoverSelector = "[data-live-edit-popover]",
  hoverPreview,
  onDisabled,
  children,
}: LiveEditProviderConfig<TTheme> & { children: ReactNode }) {
  const [popover, setPopover] = useState<PopoverState>(null);
  const closePopover = useCallback(() => setPopover(null), []);

  const ctx = useMemo<LiveEditContextValue>(
    () => ({ enabled, setEnabled: onEnabledChange }),
    [enabled, onEnabledChange],
  );

  useEffect(() => {
    if (!enabled) {
      setPopover(null);
      onDisabled?.();
      return;
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(popoverSelector)) return;

      const hit = resolveTargetAt(e.clientX, e.clientY);
      if (!hit) {
        setPopover(null);
        return;
      }

      setPopover({ x: e.clientX, y: e.clientY, path: hit.path });
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, [enabled, resolveTargetAt, popoverSelector, onDisabled]);

  const popoverMeta = popover ? getTargetMeta(popover.path) : null;
  const popoverValue = popover ? getColorAtPath(theme, popover.path) : null;

  const resolveWithElement = useCallback(
    (clientX: number, clientY: number) => resolveTargetAt(clientX, clientY),
    [resolveTargetAt],
  );

  const getLabelForPath = useCallback(
    (path: string) => getTargetMeta(path)?.label ?? null,
    [getTargetMeta],
  );

  return (
    <LiveEditContext.Provider value={ctx}>
      {children}
      <LiveEditHoverPreview
        enabled={enabled}
        popoverOpen={popover !== null}
        resolveTargetAt={resolveWithElement}
        getLabelForPath={getLabelForPath}
        popoverSelector={popoverSelector}
        {...hoverPreview}
      />
      {popover && popoverMeta && popoverValue ? (
        <LiveEditPopover
          x={popover.x}
          y={popover.y}
          label={popoverMeta.label}
          format={popoverMeta.format}
          value={popoverValue}
          onChange={(next) => {
            const partial = patchColorAtPath(popover.path, next);
            if (partial) {
              writeTheme(partial);
              onColorCommitted?.(popover.path, next);
            }
          }}
          onClose={closePopover}
          popoverAttr={popoverAttr}
        />
      ) : null}
    </LiveEditContext.Provider>
  );
}
