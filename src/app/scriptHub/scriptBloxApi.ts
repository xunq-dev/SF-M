/** ScriptBlox script object (subset used by the hub UI). */
export interface ScriptBloxScript {
  _id: string;
  title: string;
  script: string;
  image?: string;
  game?: {
    name?: string;
    imageUrl?: string;
    banner?: string;
  };
}

export interface ScriptBloxFetchResult {
  scripts: ScriptBloxScript[];
}

interface ScriptBloxApiEnvelope {
  result?: { scripts?: ScriptBloxScript[] };
}

const SCRIPTBLOX_PUBLIC_ORIGIN = "https://scriptblox.com";
export const SCRIPTBLOX_GAME_PLACEHOLDER_IMAGE = `${SCRIPTBLOX_PUBLIC_ORIGIN}/assets/img/game-placeholder.png`;

/** Resolve card thumbnail URL (Turibius / ScriptBlox web parity). */
export function scriptBloxCardImageUrl(script: ScriptBloxScript): string {
  const g = script.game;
  if (g?.imageUrl?.startsWith("http")) return g.imageUrl;
  if (script.image?.startsWith("/")) return `${SCRIPTBLOX_PUBLIC_ORIGIN}${script.image}`;
  if (g?.banner?.startsWith("http")) return g.banner;
  return SCRIPTBLOX_GAME_PLACEHOLDER_IMAGE;
}

function scriptBloxBaseUrl(): string {
  // Dev: Vite proxy at /scriptblox-api → scriptblox.com (avoids CORS).
  // Prod: direct origin; may require HTTPS allowlist / backend proxy in Tauri or static hosting.
  return import.meta.env.DEV ? "/scriptblox-api" : "https://scriptblox.com";
}

export async function fetchScriptBloxPage(params: {
  query: string;
  page: number;
}): Promise<ScriptBloxFetchResult> {
  const { query, page } = params;
  const base = scriptBloxBaseUrl();
  const trimmed = query.trim();
  const endpoint = trimmed
    ? `${base}/api/script/search?q=${encodeURIComponent(trimmed)}&max=20&page=${page}`
    : `${base}/api/script/fetch?page=${page}&max=20`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`ScriptBlox HTTP ${res.status}`);
  }
  const data = (await res.json()) as ScriptBloxApiEnvelope;
  const raw = data.result?.scripts ?? [];
  const scripts: ScriptBloxScript[] = raw.map((s) => ({
    ...s,
    script: typeof s.script === "string" ? s.script : String(s.script ?? ""),
    title: typeof s.title === "string" ? s.title : String(s.title ?? "Untitled"),
    _id: typeof s._id === "string" ? s._id : String(s._id ?? ""),
  }));
  return { scripts };
}

function pickScriptBody(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  const result = root.result;
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  const scriptField = r.script;
  if (typeof scriptField === "string") return scriptField;
  if (scriptField && typeof scriptField === "object") {
    const inner = scriptField as Record<string, unknown>;
    if (typeof inner.script === "string") return inner.script;
  }
  return "";
}

/**
 * Loads full Lua source when the list endpoint returns an empty `script` field.
 * Tries common ScriptBlox API shapes used by fetch-by-id endpoints.
 */
export async function fetchScriptBloxScriptBody(id: string): Promise<string> {
  const base = scriptBloxBaseUrl();
  const trimmed = id.trim();
  if (!trimmed) throw new Error("Missing script id.");
  const urls = [
    `${base}/api/script/fetch?id=${encodeURIComponent(trimmed)}`,
    `${base}/api/script/${encodeURIComponent(trimmed)}`,
    `${base}/api/script/fetch/${encodeURIComponent(trimmed)}`,
  ];
  let lastStatus = 0;
  for (const url of urls) {
    const res = await fetch(url);
    lastStatus = res.status;
    if (!res.ok) continue;
    const data: unknown = await res.json();
    const body = pickScriptBody(data);
    if (body.trim()) return body;
  }
  throw new Error(`ScriptBlox could not load script source (last HTTP ${lastStatus}).`);
}

