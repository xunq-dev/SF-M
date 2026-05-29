import { useContext, useCallback, useEffect, type ReactNode } from "react";
import {
  readV3ThemeUiLiveEdit,
  useV3Theme,
  V3_LIVE_EDIT_CHANGED_EVENT,
  writeV3Theme,
} from "./v3Theme";
import {
  getLiveEditTargetMeta,
  getThemeColorAtPath,
  patchThemeColorAtPath,
} from "./v3LiveEditRegistry";
import { resolveLiveEditTargetAt } from "./v3LiveEditHitTest";
import { LiveEditProvider, LiveEditContext } from "@/app/liveEdit/LiveEditProvider";
import { afterLiveEditPatch } from "@/app/liveEdit/liveEditWrite";

export function useV3LiveEdit() {
  const ctx = useContext(LiveEditContext);
  if (!ctx) {
    return {
      enabled: readV3ThemeUiLiveEdit(),
      setEnabled: () => {},
    };
  }
  return ctx;
}

export function V3LiveEditProvider({
  enabled,
  onEnabledChange,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const theme = useV3Theme();

  const resolveTargetAt = useCallback(
    (clientX: number, clientY: number) => resolveLiveEditTargetAt(clientX, clientY),
    [],
  );
  const onColorCommitted = useCallback((path: string, hex: string) => {
    void afterLiveEditPatch(path, hex, "v3");
  }, []);

  useEffect(() => {
    const onLiveEditChanged = () => {
      if (!readV3ThemeUiLiveEdit()) {
        /* provider clears popover when disabled */
      }
    };
    window.addEventListener(V3_LIVE_EDIT_CHANGED_EVENT, onLiveEditChanged);
    return () => window.removeEventListener(V3_LIVE_EDIT_CHANGED_EVENT, onLiveEditChanged);
  }, []);

  return (
    <LiveEditProvider
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      theme={theme}
      resolveTargetAt={resolveTargetAt}
      getTargetMeta={getLiveEditTargetMeta}
      getColorAtPath={getThemeColorAtPath}
      patchColorAtPath={patchThemeColorAtPath}
      writeTheme={writeV3Theme}
      onColorCommitted={onColorCommitted}
      popoverAttr="data-live-edit-popover"
      popoverSelector="[data-live-edit-popover]"
      hoverPreview={{
        bodyClass: "v3-live-edit-active",
        outlineColor: "var(--v3-accent-primary, #5ee85e)",
        pillBg: "var(--v3-accent-primary, #5ee85e)",
        pillText: "#0f1a0f",
      }}
    >
      {children}
    </LiveEditProvider>
  );
}
