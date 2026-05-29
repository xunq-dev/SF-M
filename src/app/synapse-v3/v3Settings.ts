import { useEffect, useState } from "react";

const V3_SETTINGS_KEY = "synapse.v3Settings.v1";

export type V3Settings = {
  aiFeatures: boolean;
  compactButtons: boolean;
  compactTabs: boolean;
  defaultTabContent?: string;
};

export const DEFAULT_V3_SETTINGS: V3Settings = {
  aiFeatures: false,
  compactButtons: false,
  compactTabs: false,
  defaultTabContent: "",
};

export const V3_SETTINGS_CHANGED_EVENT = "synapse:v3-settings-changed";

export function readV3Settings(): V3Settings {
  try {
    const raw = localStorage.getItem(V3_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_V3_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<V3Settings>;
    return { ...DEFAULT_V3_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_V3_SETTINGS };
  }
}

export function writeV3Settings(partial: Partial<V3Settings>): V3Settings {
  const next = { ...readV3Settings(), ...partial };
  try {
    localStorage.setItem(V3_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(V3_SETTINGS_CHANGED_EVENT));
  return next;
}

export function useV3Settings(): V3Settings {
  const [settings, setSettings] = useState<V3Settings>(() => readV3Settings());

  useEffect(() => {
    const sync = () => setSettings(readV3Settings());
    window.addEventListener(V3_SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(V3_SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return settings;
}
