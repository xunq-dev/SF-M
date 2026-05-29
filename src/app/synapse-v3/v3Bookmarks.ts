const STORAGE_KEY = "synapse.v3.bookmarks";

/** Read the set of bookmarked script IDs from localStorage. */
export function readV3Bookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((v: unknown) => typeof v === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

/** Persist the bookmark set to localStorage. */
function writeV3Bookmarks(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/** Toggle a script ID in/out of bookmarks. Returns the new bookmark state. */
export function toggleV3Bookmark(scriptId: string): boolean {
  const set = readV3Bookmarks();
  if (set.has(scriptId)) {
    set.delete(scriptId);
    writeV3Bookmarks(set);
    return false;
  } else {
    set.add(scriptId);
    writeV3Bookmarks(set);
    return true;
  }
}

/** Check if a script ID is bookmarked. */
export function isV3Bookmarked(scriptId: string): boolean {
  return readV3Bookmarks().has(scriptId);
}
