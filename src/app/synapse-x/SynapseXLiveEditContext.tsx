import { useCallback, useContext, useEffect, type ReactNode } from "react";
import { createLiveEditHitResolver } from "@/app/liveEdit/liveEditHitTest";
import { LiveEditContext, LiveEditProvider } from "@/app/liveEdit/LiveEditProvider";
import { afterLiveEditPatch } from "@/app/liveEdit/liveEditWrite";
import {
  readSynapseXThemeUiLiveEdit,
  SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT,
} from "./synapseXThemeUi";
import { sxLiveEdit, getSxLiveEditPathFromElement } from "./synapseXLiveEditRegistry";
import { useSynapseXTheme, writeSynapseXTheme } from "./synapseXTheme";

const resolveSxLiveEditTargetAt = createLiveEditHitResolver({
  liveAttr: "data-sx-live",
  fallbackAttr: "data-sx-live-fallback",
  popoverSelector: "[data-live-edit-popover]",
  getPathFromElement: getSxLiveEditPathFromElement,
});

export function useSynapseXLiveEdit() {
  const ctx = useContext(LiveEditContext);
  if (!ctx) {
    return { enabled: readSynapseXThemeUiLiveEdit(), setEnabled: () => {} };
  }
  return ctx;
}

export function SynapseXLiveEditProvider({
  enabled,
  onEnabledChange,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const theme = useSynapseXTheme();
  const resolveTargetAt = useCallback(
    (clientX: number, clientY: number) => resolveSxLiveEditTargetAt(clientX, clientY),
    [],
  );
  const onColorCommitted = useCallback((path: string, hex: string) => {
    void afterLiveEditPatch(path, hex, "sx");
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!readSynapseXThemeUiLiveEdit()) {
        /* cleared by provider */
      }
    };
    window.addEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  return (
    <LiveEditProvider
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      theme={theme}
      resolveTargetAt={resolveTargetAt}
      getTargetMeta={sxLiveEdit.getTargetMeta}
      getColorAtPath={sxLiveEdit.getColorAtPath}
      patchColorAtPath={sxLiveEdit.patchColorAtPath}
      writeTheme={writeSynapseXTheme}
      onColorCommitted={onColorCommitted}
      hoverPreview={{
        bodyClass: "sx-live-edit-active",
        outlineColor: "#5a9fd4",
        pillBg: "#5a9fd4",
        pillText: "#ffffff",
      }}
    >
      {children}
    </LiveEditProvider>
  );
}
