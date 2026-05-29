import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createLiveEditHitResolver } from "@/app/liveEdit/liveEditHitTest";
import { afterLiveEditPatch } from "@/app/liveEdit/liveEditWrite";
import { LiveEditContext, LiveEditProvider } from "@/app/liveEdit/LiveEditProvider";
import {
  readShellThemeUiLiveEdit,
  SHELL_LIVE_EDIT_CHANGED_EVENT,
} from "@/ui/shellThemeUi";
import {
  getShellColorAtPath,
  getShellLiveEditPathFromElement,
  getShellLiveEditTargetMeta,
  patchShellColorAtPath,
} from "@/ui/shellLiveEditRegistry";
import {
  readShellTheme,
  SHELL_THEME_CHANGED_EVENT,
  writeShellTheme,
  type ShellThemeState,
} from "@/ui/shellTheme";

const resolveShellLiveEditTargetAt = createLiveEditHitResolver({
  liveAttr: "data-shell-live",
  fallbackAttr: "data-shell-live-fallback",
  popoverSelector: "[data-live-edit-popover]",
  getPathFromElement: getShellLiveEditPathFromElement,
});

function useShellThemeState(): ShellThemeState {
  const [theme, setTheme] = useState(readShellTheme);
  useEffect(() => {
    const sync = () => setTheme(readShellTheme());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return theme;
}

export function useShellLiveEdit() {
  const ctx = useContext(LiveEditContext);
  if (!ctx) {
    return { enabled: readShellThemeUiLiveEdit(), setEnabled: () => {} };
  }
  return ctx;
}

export function ShellLiveEditProvider({
  enabled,
  onEnabledChange,
  children,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const theme = useShellThemeState();
  const resolveTargetAt = useCallback(
    (clientX: number, clientY: number) => resolveShellLiveEditTargetAt(clientX, clientY),
    [],
  );

  const onColorCommitted = useCallback((path: string, hex: string) => {
    void afterLiveEditPatch(path, hex, "shell");
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!readShellThemeUiLiveEdit()) {
        /* cleared by provider */
      }
    };
    window.addEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_LIVE_EDIT_CHANGED_EVENT, sync);
  }, []);

  return (
    <LiveEditProvider
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      theme={theme}
      resolveTargetAt={resolveTargetAt}
      getTargetMeta={getShellLiveEditTargetMeta}
      getColorAtPath={getShellColorAtPath}
      patchColorAtPath={patchShellColorAtPath}
      writeTheme={writeShellTheme}
      onColorCommitted={onColorCommitted}
      hoverPreview={{
        bodyClass: "shell-live-edit-active",
        outlineColor: "#5a9fd4",
        pillBg: "#5a9fd4",
        pillText: "#ffffff",
        persistLastTarget: true,
      }}
    >
      {children}
    </LiveEditProvider>
  );
}
