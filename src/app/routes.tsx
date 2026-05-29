import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router";
import { readAppSettings } from "./appSettings";
import MainLayout from "./components/MainLayout";

/**
 * When an alternate shell is persisted (`synapseOriginal` or `synapseX`), cold starts must land on
 * that shell's loading route. `main.tsx` does a synchronous `replaceState`; this loader
 * catches edge cases so Router never renders `/` first.
 */
export function altShellBootRedirectLoader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p.startsWith("/dialog")) return null;
    const mode = readAppSettings().uiMode;
    if (mode === "synapseOriginal" && !p.startsWith("/synapse-original")) return redirect("/synapse-original/main");
    if (mode === "synapseX" && !p.startsWith("/synapse-x")) return redirect("/synapse-x/main");
    if (mode === "synapseV3" && !p.startsWith("/synapse-v3")) return redirect("/synapse-v3/main");
    return null;
  } catch {
    return null;
  }
}

export const router = createBrowserRouter([
  {
    path: "/dialog/clear-current",
    lazy: () => import("./pages/DialogClearCurrentPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/dialog/close-all-tabs",
    lazy: () => import("./pages/DialogCloseAllTabsPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/dialog/close-tab",
    lazy: () => import("./pages/DialogCloseTabPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/synapse-original",
    lazy: () => import("./synapse-original/SynapseOriginalShell").then((m) => ({ Component: m.default })),
    children: [
      {
        path: "loading",
        lazy: () =>
          import("./synapse-original/pages/SynapseOriginalLoadingPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "main",
        lazy: () =>
          import("./synapse-original/pages/SynapseOriginalMainPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "script-hub",
        lazy: () =>
          import("./synapse-original/pages/SynapseOriginalScriptHubPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "settings",
        lazy: () =>
          import("./synapse-original/pages/SynapseOriginalSettingsPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "console",
        lazy: () =>
          import("./synapse-original/pages/SynapseOriginalConsolePage").then((m) => ({ Component: m.default })),
      },
    ],
  },
  {
    path: "/synapse-x",
    lazy: () => import("./synapse-x/SynapseXShell").then((m) => ({ Component: m.default })),
    children: [
      {
        path: "loading",
        lazy: () =>
          import("./synapse-x/pages/SynapseXLoadingPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "main",
        lazy: () =>
          import("./synapse-x/pages/SynapseXMainPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "script-hub",
        lazy: () =>
          import("./synapse-x/pages/SynapseXScriptHubPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "settings",
        lazy: () =>
          import("./synapse-x/pages/SynapseXSettingsPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "console",
        lazy: () =>
          import("./synapse-x/pages/SynapseXConsolePage").then((m) => ({ Component: m.default })),
      },
    ],
  },
  {
    path: "/synapse-v3",
    lazy: () => import("./synapse-v3/SynapseV3Shell").then((m) => ({ Component: m.default })),
    children: [
      {
        path: "main",
        lazy: () =>
          import("./synapse-v3/pages/SynapseV3MainPage").then((m) => ({ Component: m.default })),
      },
    ],
  },
  {
    path: "/",
    loader: altShellBootRedirectLoader,
    Component: MainLayout,
    children: [
      {
        index: true,
        lazy: () => import("./pages/EditorPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "script-hub",
        lazy: () => import("./pages/ScriptHubPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "console",
        lazy: () => import("./pages/ConsolePage").then((m) => ({ Component: m.default })),
      },
      {
        path: "settings",
        lazy: () => import("./pages/SettingsPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "integrated-webpage",
        lazy: () => import("./pages/IntegratedWebpagePage").then((m) => ({ Component: m.default })),
      },
      {
        path: "themes",
        lazy: () => import("./pages/ThemesPage").then((m) => ({ Component: m.default })),
      },
    ],
  },
]);
