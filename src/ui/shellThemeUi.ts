const STORAGE_KEY = "synapseOriginal.shellThemeUi.v1";
export const SHELL_LIVE_EDIT_CHANGED_EVENT = "synapse:shell-live-edit-changed";

type ShellThemeUiPrefs = {
  liveEditEnabled?: boolean;
};

const LEGACY_STORAGE_KEY = "cosmic.shellThemeUi.v1";

function readPrefs(): ShellThemeUiPrefs {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        try {
          localStorage.setItem(STORAGE_KEY, raw);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    }
    if (!raw) return {};
    return JSON.parse(raw) as ShellThemeUiPrefs;
  } catch {
    return {};
  }
}

function writePrefs(partial: ShellThemeUiPrefs): void {
  const next = { ...readPrefs(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(SHELL_LIVE_EDIT_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function readShellThemeUiLiveEdit(): boolean {
  return readPrefs().liveEditEnabled === true;
}

export function writeShellThemeUiLiveEdit(liveEditEnabled: boolean): void {
  writePrefs({ liveEditEnabled });
}
