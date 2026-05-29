const STORAGE_KEY = "synapse.synapseXThemeUi.v1";
export const SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT = "synapse:synapse-x-live-edit-changed";

type SynapseXThemeUiPrefs = {
  liveEditEnabled?: boolean;
};

function readPrefs(): SynapseXThemeUiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SynapseXThemeUiPrefs;
  } catch {
    return {};
  }
}

function writePrefs(partial: SynapseXThemeUiPrefs): void {
  const next = { ...readPrefs(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(SYNAPSE_X_LIVE_EDIT_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function readSynapseXThemeUiLiveEdit(): boolean {
  return readPrefs().liveEditEnabled === true;
}

export function writeSynapseXThemeUiLiveEdit(liveEditEnabled: boolean): void {
  writePrefs({ liveEditEnabled });
}
