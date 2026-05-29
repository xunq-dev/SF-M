import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "@/app/tauriEnv";

/** Opens a URL in the system default browser. Prefer this over `window.open` inside Tauri. */
export async function openExternalUrl(url: string): Promise<void> {
  const u = url.trim();
  if (isTauriApp()) {
    await invoke("open_external_url", { url: u });
    return;
  }
  window.open(u, "_blank", "noopener,noreferrer");
}

export const SYNAPSE_FRAMEWORK_SITE_URL = "https://synapseframework.netlify.app";

export function openSynapseFrameworkSite(): Promise<void> {
  return openExternalUrl(SYNAPSE_FRAMEWORK_SITE_URL);
}
