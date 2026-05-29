import { invoke } from "@tauri-apps/api/core";
import { isTauriApp } from "@/app/tauriEnv";
import type { V3AiProvider, V3AiSettings } from "./v3AiSettings";

export type AiModelOption = { id: string; label: string };

export function getEffectiveAiModel(settings: V3AiSettings): string {
  const custom = settings.customModel?.trim();
  if (custom) return custom;
  return settings.model.trim();
}

async function fetchAiModelsFromWeb(
  provider: V3AiProvider,
  apiKey: string,
): Promise<AiModelOption[]> {
  switch (provider) {
    case "opencode":
      return fetchOpenCodeModels(apiKey);
    case "openai":
      return fetchOpenAiModels(apiKey);
    case "claude":
      return fetchClaudeModels(apiKey);
    case "gemini":
      return fetchGeminiModels(apiKey);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

function sortOptions(options: AiModelOption[]): AiModelOption[] {
  return [...options].sort((a, b) => a.id.localeCompare(b.id));
}

function isOpenAiChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  const excluded = [
    "embedding",
    "whisper",
    "dall-e",
    "tts",
    "moderation",
    "davinci",
    "babbage",
    "curie",
    "ada",
    "realtime",
    "transcribe",
    "sora",
    "audio-preview",
    "image",
  ];
  if (excluded.some((part) => lower.includes(part))) return false;
  return (
    lower.startsWith("gpt-") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4") ||
    lower.startsWith("chatgpt-")
  );
}

async function readHttpError(res: Response, provider: string): Promise<string> {
  const body = await res.text().catch(() => "");
  if (!body.trim()) return `${provider} models: HTTP ${res.status}`;
  return `${provider} models: HTTP ${res.status} — ${body.slice(0, 400)}`;
}

async function fetchOpenCodeModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch("https://opencode.ai/zen/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(await readHttpError(res, "OpenCode"));
  const data = (await res.json()) as { data?: { id?: string }[] };
  const options = (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((id) => ({ id, label: id }));
  if (!options.length) throw new Error("OpenCode returned no models.");
  return sortOptions(options);
}

async function fetchOpenAiModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(await readHttpError(res, "OpenAI"));
  const data = (await res.json()) as { data?: { id?: string }[] };
  const options = (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && isOpenAiChatModel(id))
    .map((id) => ({ id, label: id }));
  if (!options.length) throw new Error("OpenAI returned no chat models for this key.");
  return sortOptions(options);
}

async function fetchClaudeModels(apiKey: string): Promise<AiModelOption[]> {
  const options: AiModelOption[] = [];
  let afterId: string | undefined;

  for (;;) {
    const url = new URL("https://api.anthropic.com/v1/models");
    if (afterId) url.searchParams.set("after_id", afterId);
    const res = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) throw new Error(await readHttpError(res, "Claude"));
    const data = (await res.json()) as {
      data?: { id?: string; display_name?: string }[];
      has_more?: boolean;
      last_id?: string;
    };
    for (const entry of data.data ?? []) {
      if (typeof entry.id !== "string" || !entry.id) continue;
      const label = entry.display_name?.trim()
        ? `${entry.display_name} (${entry.id})`
        : entry.id;
      options.push({ id: entry.id, label });
    }
    if (data.has_more && data.last_id) {
      afterId = data.last_id;
      continue;
    }
    break;
  }

  if (!options.length) throw new Error("Claude returned no models.");
  return options;
}

async function fetchGeminiModels(apiKey: string): Promise<AiModelOption[]> {
  const options: AiModelOption[] = [];
  let pageToken: string | undefined;

  for (;;) {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error(await readHttpError(res, "Gemini"));
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
      nextPageToken?: string;
    };
    for (const entry of data.models ?? []) {
      if (typeof entry.name !== "string" || !entry.name) continue;
      const methods = entry.supportedGenerationMethods ?? [];
      const supportsChat =
        methods.includes("generateContent") ||
        entry.name.toLowerCase().includes("gemini");
      if (!supportsChat) continue;
      const id = entry.name.replace(/^models\//, "");
      if (!id) continue;
      options.push({ id, label: id });
    }
    pageToken = data.nextPageToken?.trim() || undefined;
    if (!pageToken) break;
  }

  if (!options.length) throw new Error("Gemini returned no generateContent models.");
  return sortOptions(options);
}

export async function fetchAiModels(
  provider: V3AiProvider,
  apiKey: string,
): Promise<AiModelOption[]> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Add an API key to load models.");
  }

  if (isTauriApp()) {
    const models = await invoke<AiModelOption[]>("fetch_ai_models", {
      provider,
      apiKey: key,
    });
    if (!models.length) {
      throw new Error("Provider returned no models.");
    }
    return models;
  }

  return fetchAiModelsFromWeb(provider, key);
}
