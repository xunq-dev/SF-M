import { createContext, useContext, type ReactNode } from "react";
import type { ShellThemeState } from "@/ui/shellTheme";

export type ShellChromeContextValue = {
  shellTheme: ShellThemeState;
  /** Integrated shell media shows through the page column (routes use a transparent root) */
  hasPageBackground: boolean;
  pageAreaBg: string;
  /** Opaque hex used for route chrome luminance (shell bg when page column is transparent over integrated media). */
  resolvedRouteBackground: string;
  /** #000000 or #ffffff for primary route copy and inherited shell chrome text. */
  routeChromeForeground: string;
};

const ShellChromeContext = createContext<ShellChromeContextValue | null>(null);

export function ShellChromeProvider({
  value,
  children,
}: {
  value: ShellChromeContextValue;
  children: ReactNode;
}) {
  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>;
}

export function useShellChrome(): ShellChromeContextValue {
  const v = useContext(ShellChromeContext);
  if (!v) {
    throw new Error("useShellChrome must be used under ShellChromeProvider");
  }
  return v;
}

export type { ShellThemeState };
