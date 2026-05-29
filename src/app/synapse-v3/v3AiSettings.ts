import { useEffect, useState } from "react";

export type V3AiProvider = "claude" | "openai" | "gemini" | "opencode";

export type V3AiSettings = {
  provider: V3AiProvider;
  model: string;
  customModel?: string;
};

export type V3AiSecrets = Partial<Record<V3AiProvider, string>>;

const SETTINGS_KEY = "synapse.v3AiSettings.v1";
const SECRETS_KEY = "synapse.v3AiSecrets.v1";

export const V3_AI_SETTINGS_CHANGED_EVENT = "synapse:v3-ai-settings-changed";

export const V3_AI_PROVIDER_LABELS: Record<V3AiProvider, string> = {
  claude: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
  opencode: "OpenCode",
};

export const V3_AI_DEFAULT_MODELS: Record<V3AiProvider, string> = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  opencode: "claude-sonnet-4-6",
};

export const DEFAULT_V3_AI_SETTINGS: V3AiSettings = {
  provider: "claude",
  model: V3_AI_DEFAULT_MODELS.claude,
};

function readSecrets(): V3AiSecrets {
  try {
    const raw = localStorage.getItem(SECRETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as V3AiSecrets;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return {};
}

function writeSecrets(secrets: V3AiSecrets): void {
  try {
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  } catch {
    /* ignore */
  }
}

export function readV3AiSettings(): V3AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_V3_AI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<V3AiSettings>;
    const provider =
      parsed.provider === "openai" ||
      parsed.provider === "gemini" ||
      parsed.provider === "opencode" ||
      parsed.provider === "claude"
        ? parsed.provider
        : DEFAULT_V3_AI_SETTINGS.provider;
    const model =
      typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model.trim()
        : V3_AI_DEFAULT_MODELS[provider];
    const customModel =
      typeof parsed.customModel === "string" && parsed.customModel.trim()
        ? parsed.customModel.trim()
        : undefined;
    return { provider, model, ...(customModel ? { customModel } : {}) };
  } catch {
    return { ...DEFAULT_V3_AI_SETTINGS };
  }
}

export function writeV3AiSettings(partial: Partial<V3AiSettings>): V3AiSettings {
  const next = { ...readV3AiSettings(), ...partial };
  if (!next.customModel?.trim()) {
    delete next.customModel;
  } else {
    next.customModel = next.customModel.trim();
  }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(V3_AI_SETTINGS_CHANGED_EVENT));
  return next;
}

export function readV3AiApiKeys(): V3AiSecrets {
  return readSecrets();
}

export function writeV3AiApiKey(provider: V3AiProvider, apiKey: string): V3AiSecrets {
  const secrets = { ...readSecrets(), [provider]: apiKey };
  writeSecrets(secrets);
  window.dispatchEvent(new Event(V3_AI_SETTINGS_CHANGED_EVENT));
  return secrets;
}

export function getV3AiApiKey(provider: V3AiProvider): string {
  return readSecrets()[provider]?.trim() ?? "";
}

export { getEffectiveAiModel } from "./v3AiModelCatalog";

export function useV3AiSettings(): V3AiSettings & { apiKeys: V3AiSecrets } {
  const [state, setState] = useState(() => ({
    ...readV3AiSettings(),
    apiKeys: readV3AiApiKeys(),
  }));

  useEffect(() => {
    const sync = () =>
      setState({
        ...readV3AiSettings(),
        apiKeys: readV3AiApiKeys(),
      });
    window.addEventListener(V3_AI_SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(V3_AI_SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}
