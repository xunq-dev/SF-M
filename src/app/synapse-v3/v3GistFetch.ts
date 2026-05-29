import { normalizeRawGistUrl } from "./v3Gists";

/** Fetch the latest script text from a raw URL (cache-busted). */
export async function fetchRawGistScript(rawUrl: string): Promise<string> {
  const normalized = normalizeRawGistUrl(rawUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must use http or https.");
  }

  const bust = `_=${Date.now()}`;
  const fetchUrl = normalized.includes("?") ? `${normalized}&${bust}` : `${normalized}?${bust}`;
  const res = await fetch(fetchUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch script (${res.status}).`);
  }
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Script was empty.");
  }
  return text;
}
