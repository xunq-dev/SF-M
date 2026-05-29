/** Returns true when `path` points inside a scripts/autoexecute folder. */
export function isAutoexecutePath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/autoexecute/");
}

/** Sanitize a user-provided script base name for autoexecute saves (no spaces). */
export function sanitizeAutoexecuteBaseName(name: string): string {
  const noSpaces = name.replace(/\s+/g, "-");
  const cleaned = noSpaces.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/-+/g, "-");
  const trimmed = cleaned.replace(/^-+|-+$/g, "").trim();
  return trimmed.slice(0, 80) || "script";
}

/** Ensure `.lua` extension on a file name. */
export function ensureLuaFileName(baseName: string): string {
  const base = sanitizeAutoexecuteBaseName(baseName.replace(/\.lua$/i, ""));
  return `${base}.lua`;
}
