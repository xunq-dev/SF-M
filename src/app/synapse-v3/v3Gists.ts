const STORAGE_KEY = "synapse.v3.gists";

export type V3GistEntry = {
  id: string;
  /** Display label derived from the URL file name. */
  title: string;
  /** Raw content URL (e.g. raw.githubusercontent.com/.../script.lua). */
  rawUrl: string;
};

function newGistId(): string {
  return `gist_${Math.random().toString(36).slice(2, 12)}`;
}

export function titleFromRawGistUrl(rawUrl: string): string {
  try {
    const path = new URL(rawUrl.trim()).pathname;
    const base = path.split("/").pop() ?? "Gist";
    return base
      .replace(/\.lua$/i, "")
      .replace(/[-_]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || "Gist";
  } catch {
    return "Gist";
  }
}

export function normalizeRawGistUrl(input: string): string {
  return input.trim();
}

export function isValidRawGistUrl(input: string): boolean {
  try {
    const url = new URL(normalizeRawGistUrl(input));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Prefer URLs that look like raw Lua script endpoints. */
export function isLikelyRawLuaUrl(input: string): boolean {
  try {
    const path = new URL(normalizeRawGistUrl(input)).pathname.toLowerCase();
    return path.endsWith(".lua") || path.includes("/raw/");
  } catch {
    return false;
  }
}

function writeGists(entries: V3GistEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function readV3Gists(): V3GistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is V3GistEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as V3GistEntry).id === "string" &&
        typeof (e as V3GistEntry).title === "string" &&
        typeof (e as V3GistEntry).rawUrl === "string",
    );
  } catch {
    return [];
  }
}

export function addV3Gist(rawUrl: string): V3GistEntry {
  const normalized = normalizeRawGistUrl(rawUrl);
  const entries = readV3Gists();
  const existing = entries.find((e) => e.rawUrl === normalized);
  if (existing) return existing;
  const entry: V3GistEntry = {
    id: newGistId(),
    title: titleFromRawGistUrl(normalized),
    rawUrl: normalized,
  };
  writeGists([...entries, entry]);
  return entry;
}

export function removeV3Gist(id: string): void {
  writeGists(readV3Gists().filter((e) => e.id !== id));
}
