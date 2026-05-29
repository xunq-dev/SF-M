import { useCallback, useContext, useEffect, type ReactNode } from "react";
import { createLiveEditHitResolver } from "@/app/liveEdit/liveEditHitTest";
import { LiveEditContext, LiveEditProvider } from "@/app/liveEdit/LiveEditProvider";
import { afterLiveEditPatch } from "@/app/liveEdit/liveEditWrite";
import { readOgThemeUiLiveEdit, OG_LIVE_EDIT_CHANGED_EVENT } from "./ogThemeUi";
import { ogLiveEdit, getOgLiveEditPathFromElement } from "./ogLiveEditRegistry";
import { useOgTheme, writeOgTheme } from "./ogTheme";

const resolveOgLiveEditTargetAt = createLiveEditHitResolver({
  liveAttr: "data-og-live",
  fallbackAttr: "data-og-live-fallback",
  popoverSelector: "[data-live-edit-popover]",
  getPathFromElement: getOgLiveEditPathFromElement,
});

export function useOgLiveEdit() {
  const ctx = useContext(LiveEditContext);
  if (!ctx) {
    return { enabled: readOgThemeUiLiveEdit(), setEnabled: () => {} };
  }
  return ctx;
}

export function OgLiveEditProvider({
  enabled,
  onEnabledChange,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const theme = useOgTheme();
  const resolveTargetAt = useCallback(
    (clientX: number, clientY: number) => resolveOgLiveEditTargetAt(clientX, clientY),
    [],
  );
  const onColorCommitted = useCallback((path: string, hex: string) => {
    void afterLiveEditPatch(path, hex, "og");
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!readOgThemeUiLiveEdit()) {
        /* cleared by provider */
      }
    };
    window.addEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(OG_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  return (
    <LiveEditProvider
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      theme={theme}
      resolveTargetAt={resolveTargetAt}
      getTargetMeta={ogLiveEdit.getTargetMeta}
      getColorAtPath={ogLiveEdit.getColorAtPath}
      patchColorAtPath={ogLiveEdit.patchColorAtPath}
      writeTheme={writeOgTheme}
      onColorCommitted={onColorCommitted}
      hoverPreview={{
        bodyClass: "og-live-edit-active",
        outlineColor: "#5a9fd4",
        pillBg: "#5a9fd4",
        pillText: "#ffffff",
      }}
    >
      {children}
    </LiveEditProvider>
  );
}
