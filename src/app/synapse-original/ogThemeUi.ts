const STORAGE_KEY = "synapse.ogThemeUi.v1";
export const OG_LIVE_EDIT_CHANGED_EVENT = "synapse:og-live-edit-changed";

type OgThemeUiPrefs = {
  liveEditEnabled?: boolean;
};

function readPrefs(): OgThemeUiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OgThemeUiPrefs;
  } catch {
    return {};
  }
}

function writePrefs(partial: OgThemeUiPrefs): void {
  const next = { ...readPrefs(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(OG_LIVE_EDIT_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function readOgThemeUiLiveEdit(): boolean {
  return readPrefs().liveEditEnabled === true;
}

export function writeOgThemeUiLiveEdit(liveEditEnabled: boolean): void {
  writePrefs({ liveEditEnabled });
}
