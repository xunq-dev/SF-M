import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { SHELL_CHROME_HEIGHT, SHELL_CHROME_WIDTH } from "../../ui/shellChromeGeometry";
import { ShellFitBlock } from "../components/ShellFitBlock";
import { ShellFitLine } from "../components/ShellFitLine";
import { integratedPageChromeCssVars, toolPanelCssVars } from "../../ui/shellTheme";
import { useShellChrome } from "../shellChromeContext";
import { isTauriApp } from "../tauriEnv";
import { DEFAULT_MINIMAP_SCALE } from "../appSettings";
import { useAppSettings } from "../useAppSettings";
import { MinimapSizeSettingsShell } from "@/app/components/settings/MinimapSizeSettings";
import { shouldApplyEdgeCurve } from "../appSettings";
import { centerWindowOnCurrentMonitor } from "../windowPlacement";
import { applyShellWindowMinSize } from "../windowConstraints";
import { normalizeEmbeddedPageUrl } from "../util/embeddedPageUrl";
import { SYNAPSE_ORIGINAL_SIZES, setMainWindowSize } from "../synapse-original/windowOps";
import { SYNAPSE_X_SIZES } from "../synapse-x/windowOps";

function toggleBoxClass(on: boolean) {
  return `h-[13px] w-[14px] shrink-0 border border-[#5a5a5a] ${on ? "bg-[#5a9e5f]" : "bg-[#c0c0c0]"}`;
}

type OptionRowProps = {
  title: string;
  pressed: boolean;
  onToggle: () => void;
  description: string;
  disabled?: boolean;
};

function OptionRow({ title, pressed, onToggle, description, disabled }: OptionRowProps) {
  return (
    <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onToggle}
          className={`mt-0.5 shrink-0 ${toggleBoxClass(pressed)} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
            <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
              {title}
            </ShellFitLine>
          </p>
          <p className="min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
            <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
              {description}
            </ShellFitBlock>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { hasPageBackground, pageAreaBg, shellTheme } = useShellChrome();

  const optionsHeaderBarStyle = useMemo(
    () => ({
      borderColor: shellTheme.editorControlBarBorder,
      color: shellTheme.editorControlBarText,
      backgroundImage: `linear-gradient(to bottom, ${shellTheme.editorControlBarButtonFrom}, ${shellTheme.editorControlBarButtonTo})`,
      boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.09)",
    }),
    [
      shellTheme.editorControlBarBorder,
      shellTheme.editorControlBarText,
      shellTheme.editorControlBarButtonFrom,
      shellTheme.editorControlBarButtonTo,
    ],
  );
  const { settings, update } = useAppSettings();
  const [altgenDraft, setAltgenDraft] = useState(settings.altgenPageUrl);
  const [altgenErr, setAltgenErr] = useState<string | null>(null);
  const prevResizableRef = useRef<boolean | null>(null);

  useEffect(() => {
    setAltgenDraft(settings.altgenPageUrl);
  }, [settings.altgenPageUrl]);

  useEffect(() => {
    if (!isTauriApp()) return;
    const win = getCurrentWindow();
    void win.setResizable(settings.resizableWindow);
    void applyShellWindowMinSize(settings.resizableWindow);
    const prev = prevResizableRef.current;
    prevResizableRef.current = settings.resizableWindow;
    if (prev === true && settings.resizableWindow === false) {
      void win
        .setSize(new LogicalSize(SHELL_CHROME_WIDTH, SHELL_CHROME_HEIGHT))
        .then(() => centerWindowOnCurrentMonitor());
    }
  }, [settings.resizableWindow]);

  useEffect(() => {
    if (!isTauriApp()) return;
    const win = getCurrentWindow();
    if (settings.alwaysOnTop) {
      void win.setAlwaysOnBottom(false);
    }
    void win.setAlwaysOnTop(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        backgroundColor: hasPageBackground ? "transparent" : pageAreaBg,
        ...toolPanelCssVars(shellTheme.toolPanelsTheme),
        ...integratedPageChromeCssVars(shellTheme.integratedPageChrome),
      }}
    >
      <header
        className="shrink-0 border-b px-[10px] pb-2 pt-[6px]"
        style={optionsHeaderBarStyle}
      >
        <p className="min-w-0 font-normal" style={{ color: shellTheme.editorControlBarText }}>
          <ShellFitLine basePx={27} fitOptions={{ minPx: 8 }}>
            Options
          </ShellFitLine>
        </p>
        <p
          className="mt-1 max-w-md text-[10px] leading-snug opacity-90"
          style={{ color: shellTheme.editorControlBarText }}
        >
          Behaviour for the script editor and the desktop shell. Appearance is under Themes → Theme
          control.
        </p>
      </header>

      <div className="synapse-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[10px] py-3">
        <div className="mx-auto flex max-w-[540px] flex-col gap-2.5">
          <OptionRow
            title="Auto-attach"
            pressed={settings.autoAttach}
            onToggle={() => update({ autoAttach: !settings.autoAttach })}
            description="When enabled, the attach flow starts once after the loading screen when the main UI appears. Turn it on before restarting if you want it on the next open."
          />

          <OptionRow
            title="Clear confirmation"
            pressed={settings.clearConfirmation}
            onToggle={() => update({ clearConfirmation: !settings.clearConfirmation })}
            description="When enabled, Clear asks before clearing the active tab’s script, and Shift+Clear asks before closing all tabs and starting fresh. Desktop uses separate confirmation windows."
          />

          <OptionRow
            title="Close tab confirmation"
            pressed={settings.closeFileConfirmation}
            onToggle={() => update({ closeFileConfirmation: !settings.closeFileConfirmation })}
            description="Ask before closing a script tab from the tab context menu when more than one tab is open."
          />

          <OptionRow
            title="Resizable window"
            pressed={settings.resizableWindow}
            disabled={!isTauriApp()}
            onToggle={() => {
              if (!isTauriApp()) return;
              update({ resizableWindow: !settings.resizableWindow });
            }}
            description={
              isTauriApp()
                ? "Allow dragging the window edges to resize the Synapse desktop window. Turning this off restores the default shell size and recenters the window."
                : "Only applies to the desktop app; the browser window is managed by the browser."
            }
          />

          <OptionRow
            title="Always on top"
            pressed={settings.alwaysOnTop}
            disabled={!isTauriApp()}
            onToggle={() => {
              if (!isTauriApp()) return;
              update({ alwaysOnTop: !settings.alwaysOnTop });
            }}
            description={
              isTauriApp()
                ? "Keep the Synapse desktop window above other windows. Turning off restores normal stacking."
                : "Only applies to the desktop app; the browser tab is managed by the browser."
            }
          />

          <OptionRow
            title="Edge curve"
            pressed={shouldApplyEdgeCurve(settings)}
            disabled={!isTauriApp()}
            onToggle={() => {
              if (!isTauriApp()) return;
              const current = shouldApplyEdgeCurve(settings);
              update({ edgeCurveDefault: !current });
            }}
            description={
              isTauriApp()
                ? "Apply Windows 11 rounded corners to the Synapse desktop window. Turn this off for sharp square corners."
                : "Only applies to the desktop app; the browser window is managed by the browser."
            }
          />

          <OptionRow
            title="Enhanced script list"
            pressed={settings.enhancedScriptListDefault ?? false}
            onToggle={() =>
              update({
                enhancedScriptListDefault: !(settings.enhancedScriptListDefault ?? false),
              })
            }
            description="Search, sections, bookmarks, gists, row actions, and full script-list theming in the editor."
          />

          <OptionRow
            title="Minimap"
            pressed={settings.minimapEnabled}
            onToggle={() => update({ minimapEnabled: !settings.minimapEnabled })}
            description="Show a miniature preview of the entire script on the right side of the editor for quick navigation."
          />

          <MinimapSizeSettingsShell
            enabled={settings.minimapEnabled}
            scale={settings.minimapScale}
            onScaleChange={(minimapScale) => update({ minimapScale })}
            onReset={() => update({ minimapScale: DEFAULT_MINIMAP_SCALE })}
          />

          <OptionRow
            title="Editor error logging"
            pressed={settings.errorLoggingEnabled}
            onToggle={() => update({ errorLoggingEnabled: !settings.errorLoggingEnabled })}
            description="EXPERIMENTAL - CAN SHOW FALSE ERRORS. Displays syntax errors inside the editor using a Luau diagnostics engine."
          />

          <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
            <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
              <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
                Bridge method
              </ShellFitLine>
            </p>
            <p className="mb-2 min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
              <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
                Synapse uses the macOS TCP executor bridge and automatically detects MacSploit or Opiumware.
              </ShellFitBlock>
            </p>
            <select
              value={settings.bridgeMethod}
              onChange={(e) => update({ bridgeMethod: e.target.value as any })}
              className="box-border w-full rounded border border-[color:var(--tp-field-border)] bg-[color:var(--tp-field-bg)] px-2.5 py-2 text-[10px] text-[color:var(--tp-field-text)] outline-none focus-visible:border-[color:var(--tp-field-focus-border)] cursor-pointer"
            >
              <option value="macos">macOS TCP Executor</option>
            </select>
          </section>

          <SynapseOriginalUiModeRow />
          <SynapseXUiModeRow />
          <SynapseV3UiModeRow />

          <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
            <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
              <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
                Integrated webpage
              </ShellFitLine>
            </p>
            <p className="mb-2 min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
              <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
                Opens inside the shell next to the sidebar—handy for alt generators, whatexps, and Framework tools
                status, and similar tools. The URL is saved in this app&apos;s local storage. Only http and https
                links are allowed.
              </ShellFitBlock>
            </p>
            <label className="block">
              <span className="mb-1 block text-[9px] text-[color:var(--tp-page-subtitle)]">Website URL</span>
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={altgenDraft}
                onChange={(e) => {
                  setAltgenDraft(e.target.value);
                  setAltgenErr(null);
                }}
                className="box-border w-full rounded border border-[color:var(--tp-field-border)] bg-[color:var(--tp-field-bg)] px-2.5 py-2 text-[10px] text-[color:var(--tp-field-text)] outline-none placeholder:text-[color:var(--tp-field-placeholder)] focus-visible:border-[color:var(--tp-field-focus-border)]"
              />
            </label>
            {altgenErr ? <p className="mt-1.5 text-[10px] text-red-400">{altgenErr}</p> : null}
            <div className="mt-2">
              <button
                type="button"
                className="rounded border border-[color:var(--tp-toolbar-btn-border)] bg-[color:var(--tp-toolbar-btn-bg)] px-2.5 py-1.5 text-[10px] text-[color:var(--tp-toolbar-btn-text)] hover:bg-[color:var(--tp-toolbar-btn-hover-bg)]"
                onClick={() => {
                  const n = normalizeEmbeddedPageUrl(altgenDraft);
                  if (!n) {
                    setAltgenErr("Enter a valid http or https URL.");
                    return;
                  }
                  setAltgenErr(null);
                  update({ altgenPageUrl: n });
                  navigate("/integrated-webpage");
                }}
              >
                Open
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * "UI Mode" row in default Settings. Toggling on writes `uiMode: "synapseOriginal"`, locks the host
 * window to the Synapse Original loading-screen size, and navigates the main window to
 * `/synapse-original/loading`. From there `SynapseOriginalLoadingPage` morphs up to the 838x372 main window.
 *
 * The reverse path (back to default UI) lives in the Synapse Original Settings window — it writes
 * `uiMode: "default"`, the storage event reaches `SynapseOriginalShell` here, and the host window
 * morphs back via `restoreDefaultMainWindow()`.
 *
 * `uiMode` is exclusive: enabling OG turns off Synapse X test UI and vice versa (single storage field).
 */
function SynapseOriginalUiModeRow() {
  const navigate = useNavigate();
  const { settings, update } = useAppSettings();
  const synapseOriginalOn = settings.uiMode === "synapseOriginal";

  const enableSynapseOriginal = useCallback(async () => {
    update({ uiMode: "synapseOriginal" });
    navigate("/synapse-original/main", { replace: true });
    if (isTauriApp()) {
      const { width, height } = SYNAPSE_ORIGINAL_SIZES.main;
      await setMainWindowSize(width, height);
      try {
        await centerWindowOnCurrentMonitor();
      } catch {
        /* ignore */
      }
    }
  }, [navigate, update]);

  return (
    <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={synapseOriginalOn}
          onClick={() => {
            if (synapseOriginalOn) return;
            void enableSynapseOriginal();
          }}
          className={`mt-0.5 shrink-0 ${toggleBoxClass(synapseOriginalOn)}`}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
            <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
              Synapse 2017
            </ShellFitLine>
          </p>
          <p className="min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
            <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
              Switch to the original Synapse multi-window shell: a 838x372 main window and
              separate windows for Script Hub, Settings, and the F9 console. All your scripts,
              attach state, and ScriptBlox access carry over. Toggle this off again from the
              Synapse 2017 Settings window to morph back to the Synapse Blue UI. Cannot be on at
              the same time as the Synapse X test UI below.
            </ShellFitBlock>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Experimental port of Synapse X WPF layouts (navigation only). Mutually exclusive with OG Synapse UI. */
function SynapseXUiModeRow() {
  const navigate = useNavigate();
  const { settings, update } = useAppSettings();
  const synapseXOn = settings.uiMode === "synapseX";

  const enableSynapseX = useCallback(async () => {
    update({ uiMode: "synapseX" });
    navigate("/synapse-x/main", { replace: true });
    if (isTauriApp()) {
      const { width, height } = SYNAPSE_X_SIZES.main;
      await setMainWindowSize(width, height);
      try {
        await centerWindowOnCurrentMonitor();
      } catch {
        /* ignore */
      }
    }
  }, [navigate, update]);

  return (
    <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={synapseXOn}
          onClick={() => {
            if (synapseXOn) return;
            void enableSynapseX();
          }}
          className={`mt-0.5 shrink-0 ${toggleBoxClass(synapseXOn)}`}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
            <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
              Synapse X
            </ShellFitLine>
          </p>
          <p className="min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
            <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
              Test UI that reproduces the legacy Synapse X window sizes and pages (loader, main,
              script hub, options) with assets from the open-source WPF project—no auth or executor
              wiring. Switch off via Options → Return to Synapse Blue UI, or enable
              Synapse 2017 above (exclusive).
            </ShellFitBlock>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Synapse v3 shell mode. Mutually exclusive with other shell modes. */
function SynapseV3UiModeRow() {
  const navigate = useNavigate();
  const { settings, update } = useAppSettings();
  const v3On = settings.uiMode === "synapseV3";

  const enableV3 = useCallback(() => {
    update({ uiMode: "synapseV3" });
    navigate("/synapse-v3/main");
  }, [navigate, update]);

  return (
    <section className="rounded-lg border border-[color:var(--tp-section-border)] bg-[color:var(--tp-section-bg)] px-3 py-2.5 shadow-[var(--tp-section-inset-shadow)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={v3On}
          onClick={() => {
            if (v3On) return;
            enableV3();
          }}
          className={`mt-0.5 shrink-0 ${toggleBoxClass(v3On)} cursor-pointer hover:brightness-110`}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 min-w-0 font-medium leading-tight text-[color:var(--tp-section-title)]">
            <ShellFitLine basePx={16} fitOptions={{ minPx: 8 }}>
              Synapse v3
            </ShellFitLine>
          </p>
          <p className="min-w-0 text-[10px] leading-snug text-[color:var(--tp-section-body)]">
            <ShellFitBlock basePx={10} fitOptions={{ minPx: 5, lineHeight: 1.42 }}>
              The Synapse v3 UI shell. Switch back via the buttons in the v3 settings page.
            </ShellFitBlock>
          </p>
        </div>
      </div>
    </section>
  );
}
