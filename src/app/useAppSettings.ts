import { useCallback, useEffect, useState } from "react";
import {
  APP_SETTINGS_CHANGED_EVENT,
  type AppSettings,
  readAppSettings,
  writeAppSettings,
} from "./appSettings";
import { CROSS_WINDOW_STORAGE_KEYS, useCrossWindowStorageSync } from "./crossWindowSync";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());

  const sync = useCallback(() => setSettings(readAppSettings()), []);

  useEffect(() => {
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, sync);
  }, [sync]);

  useCrossWindowStorageSync([CROSS_WINDOW_STORAGE_KEYS.appSettings], sync);

  const update = useCallback((partial: Partial<AppSettings>) => {
    writeAppSettings(partial);
  }, []);

  return { settings, update };
}
