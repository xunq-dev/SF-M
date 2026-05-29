import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  applyFullShellTheme,
  DEFAULT_SHELL_THEME,
  normalizeTheme,
  readShellTheme,
  type ShellThemeState,
} from "./shellTheme";
import {
  idbDeleteBackgroundImage,
  idbDeleteBackgroundVideo,
  idbDeleteInitBackgroundImage,
  idbDeleteInitBackgroundVideo,
  idbGetBackgroundImage,
  idbGetBackgroundVideo,
  idbGetInitBackgroundImage,
  idbGetInitBackgroundVideo,
  idbPutBackgroundImage,
  idbPutBackgroundVideo,
  idbPutInitBackgroundImage,
  idbPutInitBackgroundVideo,
} from "./idbVideo";

export const THEME_PACK_FORMAT = "synapse-original-theme-pack" as const;
export const THEME_PACK_VERSION = 1 as const;

export const ZIP_MANIFEST = "manifest.json";
export const ZIP_THEME = "theme.json";
export const MEDIA_MAIN_IMAGE = "media/main-background-image";
export const MEDIA_MAIN_VIDEO = "media/main-background-video";
export const MEDIA_INIT_IMAGE = "media/init-background-image";
export const MEDIA_INIT_VIDEO = "media/init-background-video";

export const MEDIA_INIT_IMAGE_SYNAPSE_ORIGINAL = "media/init-background-image-synapse-original";
export const MEDIA_INIT_VIDEO_SYNAPSE_ORIGINAL = "media/init-background-video-synapse-original";

export const MEDIA_INIT_IMAGE_SYNAPSE_X = "media/init-background-image-x";
export const MEDIA_INIT_VIDEO_SYNAPSE_X = "media/init-background-video-x";

type ThemePackManifest = {
  format: typeof THEME_PACK_FORMAT;
  version: typeof THEME_PACK_VERSION;
  exportedAt: string;
  warnings?: string[];
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

const DEFAULT_THEME_SNAPSHOT = stableStringify(
  normalizeTheme(JSON.parse(JSON.stringify(DEFAULT_SHELL_THEME))),
);

export function isShellThemeCustomized(theme: ShellThemeState): boolean {
  const snap = stableStringify(normalizeTheme(JSON.parse(JSON.stringify(theme))));
  return snap !== DEFAULT_THEME_SNAPSHOT;
}

function normalizeZipPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

function indexZipEntries(entries: Record<string, Uint8Array>): Map<string, Uint8Array> {
  const m = new Map<string, Uint8Array>();
  for (const [k, v] of Object.entries(entries)) {
    m.set(normalizeZipPath(k), v);
  }
  return m;
}

function triggerDownloadAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

type ShowSaveFilePickerFn = (options?: {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;

/**
 * Prefer native save dialog when available; otherwise `<a download>`.
 */
async function downloadThemePackBlob(blob: Blob, filename: string): Promise<void> {
  const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePickerFn })
    .showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: "Theme pack (ZIP)", accept: { "application/zip": [".zip"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "AbortError") throw e;
      /* fall through to anchor download */
    }
  }
  triggerDownloadAnchor(blob, filename);
}

function todayZipBasename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `synapse-original-theme-pack-${y}-${m}-${day}.zip`;
}

export type ExportThemePackOptions = {
  /** Export a valid ZIP even when the normalized theme equals defaults (sharing / backup). */
  includeDefaults?: boolean;
};

export async function exportThemePackBlob(
  options?: ExportThemePackOptions,
): Promise<
  { ok: true; blob: Blob; filename: string; warnings: string[] } | { ok: false; error: string }
> {
  /* Round-trip through normalize so theme.json always contains the full schema (nothing omitted). */
  const theme = normalizeTheme(JSON.parse(JSON.stringify(readShellTheme())));
  if (!options?.includeDefaults && !isShellThemeCustomized(theme)) {
    return {
      ok: false,
      error: "Nothing to export — theme matches defaults. Change something first.",
    };
  }

  const warnings: string[] = [];
  const files: Record<string, Uint8Array> = {};

  const manifest: ThemePackManifest = {
    format: THEME_PACK_FORMAT,
    version: THEME_PACK_VERSION,
    exportedAt: new Date().toISOString(),
  };

  if (theme.backgroundMode === "image" && theme.hasStoredBackgroundImage) {
    const blob = await idbGetBackgroundImage();
    if (blob) {
      files[MEDIA_MAIN_IMAGE] = new Uint8Array(await blob.arrayBuffer());
    } else {
      warnings.push("Main background image was marked stored but no blob was found; omitted from pack.");
    }
  }
  if (theme.backgroundMode === "video" && theme.hasStoredVideo) {
    const blob = await idbGetBackgroundVideo();
    if (blob) {
      files[MEDIA_MAIN_VIDEO] = new Uint8Array(await blob.arrayBuffer());
    } else {
      warnings.push("Main background video was marked stored but no blob was found; omitted from pack.");
    }
  }
  const init = theme.initTheme;
  if (init.backgroundMode === "image" && init.hasStoredBackgroundImage) {
    const blob = await idbGetInitBackgroundImage("default");
    if (blob) {
      files[MEDIA_INIT_IMAGE] = new Uint8Array(await blob.arrayBuffer());
    } else {
      warnings.push("Init background image was marked stored but no blob was found; omitted from pack.");
    }
  }
  if (init.backgroundMode === "video" && init.hasStoredVideo) {
    const blob = await idbGetInitBackgroundVideo("default");
    if (blob) {
      files[MEDIA_INIT_VIDEO] = new Uint8Array(await blob.arrayBuffer());
    } else {
      warnings.push("Init background video was marked stored but no blob was found; omitted from pack.");
    }
  }

  const initSynapseOriginal = theme.initThemeSynapseOriginal;
  if (initSynapseOriginal.backgroundMode === "image" && initSynapseOriginal.hasStoredBackgroundImage) {
    const blob = await idbGetInitBackgroundImage("synapseOriginal");
    if (blob) {
      files[MEDIA_INIT_IMAGE_SYNAPSE_ORIGINAL] = new Uint8Array(await blob.arrayBuffer());
    }
  }
  if (initSynapseOriginal.backgroundMode === "video" && initSynapseOriginal.hasStoredVideo) {
    const blob = await idbGetInitBackgroundVideo("synapseOriginal");
    if (blob) {
      files[MEDIA_INIT_VIDEO_SYNAPSE_ORIGINAL] = new Uint8Array(await blob.arrayBuffer());
    }
  }

  const initX = theme.initThemeSynapseX;
  if (initX.backgroundMode === "image" && initX.hasStoredBackgroundImage) {
    const blob = await idbGetInitBackgroundImage("synapseX");
    if (blob) {
      files[MEDIA_INIT_IMAGE_SYNAPSE_X] = new Uint8Array(await blob.arrayBuffer());
    }
  }
  if (initX.backgroundMode === "video" && initX.hasStoredVideo) {
    const blob = await idbGetInitBackgroundVideo("synapseX");
    if (blob) {
      files[MEDIA_INIT_VIDEO_SYNAPSE_X] = new Uint8Array(await blob.arrayBuffer());
    }
  }

  if (warnings.length) manifest.warnings = warnings;

  files[ZIP_MANIFEST] = strToU8(JSON.stringify(manifest));
  files[ZIP_THEME] = strToU8(JSON.stringify(theme));

  let zipped: Uint8Array;
  try {
    zipped = zipSync(files, { level: 6 });
  } catch {
    return { ok: false, error: "Could not build ZIP archive." };
  }

  return {
    ok: true,
    blob: new Blob([zipped], { type: "application/zip" }),
    filename: todayZipBasename(),
    warnings,
  };
}

export async function exportThemePack(
  options?: ExportThemePackOptions,
): Promise<{ ok: true; warnings: string[] } | { ok: false; error: string }> {
  const r = await exportThemePackBlob(options);
  if (!r.ok) return r;
  try {
    await downloadThemePackBlob(r.blob, r.filename);
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "AbortError") {
      return { ok: false, error: "Export cancelled." };
    }
    return { ok: false, error: "Could not save theme pack file." };
  }
  return { ok: true, warnings: r.warnings };
}

type MediaPick = Partial<{
  mainImage: Uint8Array;
  mainVideo: Uint8Array;
  initImage: Uint8Array;
  initVideo: Uint8Array;
  initImageSynapseOriginal: Uint8Array;
  initVideoSynapseOriginal: Uint8Array;
  initImageX: Uint8Array;
  initVideoX: Uint8Array;
}>;

async function syncIdbFromImportedTheme(next: ShellThemeState, media: MediaPick): Promise<ShellThemeState> {
  let t: ShellThemeState = {
    ...next,
    initTheme: { ...next.initTheme },
    initThemeSynapseOriginal: { ...next.initThemeSynapseOriginal },
    initThemeSynapseX: { ...next.initThemeSynapseX },
  };

  // Main backgrounds (Blue only for now, as requested "defining it the old way for blue")
  if (t.backgroundMode === "image" && t.hasStoredBackgroundImage) {
    if (media.mainImage) {
      await idbPutBackgroundImage(new Blob([media.mainImage]), "default");
    } else {
      await idbDeleteBackgroundImage("default");
      t = { ...t, hasStoredBackgroundImage: false, backgroundImageFilename: null };
    }
  } else {
    await idbDeleteBackgroundImage("default");
  }

  if (t.backgroundMode === "video" && t.hasStoredVideo) {
    if (media.mainVideo) {
      await idbPutBackgroundVideo(new Blob([media.mainVideo]), "default");
    } else {
      await idbDeleteBackgroundVideo("default");
      t = { ...t, hasStoredVideo: false, backgroundVideoFilename: null };
    }
  } else {
    await idbDeleteBackgroundVideo("default");
  }

  // Init - Default (Blue)
  if (t.initTheme.backgroundMode === "image" && t.initTheme.hasStoredBackgroundImage) {
    if (media.initImage) {
      await idbPutInitBackgroundImage(new Blob([media.initImage]), "default");
    } else {
      await idbDeleteInitBackgroundImage("default");
      t.initTheme = { ...t.initTheme, hasStoredBackgroundImage: false, backgroundImageFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundImage("default");
  }

  if (t.initTheme.backgroundMode === "video" && t.initTheme.hasStoredVideo) {
    if (media.initVideo) {
      await idbPutInitBackgroundVideo(new Blob([media.initVideo]), "default");
    } else {
      await idbDeleteInitBackgroundVideo("default");
      t.initTheme = { ...t.initTheme, hasStoredVideo: false, backgroundVideoFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundVideo("default");
  }

  // Init - Synapse Original
  if (t.initThemeSynapseOriginal.backgroundMode === "image" && t.initThemeSynapseOriginal.hasStoredBackgroundImage) {
    if (media.initImageSynapseOriginal) {
      await idbPutInitBackgroundImage(new Blob([media.initImageSynapseOriginal]), "synapseOriginal");
    } else {
      await idbDeleteInitBackgroundImage("synapseOriginal");
      t.initThemeSynapseOriginal = { ...t.initThemeSynapseOriginal, hasStoredBackgroundImage: false, backgroundImageFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundImage("synapseOriginal");
  }

  if (t.initThemeSynapseOriginal.backgroundMode === "video" && t.initThemeSynapseOriginal.hasStoredVideo) {
    if (media.initVideoSynapseOriginal) {
      await idbPutInitBackgroundVideo(new Blob([media.initVideoSynapseOriginal]), "synapseOriginal");
    } else {
      await idbDeleteInitBackgroundVideo("synapseOriginal");
      t.initThemeSynapseOriginal = { ...t.initThemeSynapseOriginal, hasStoredVideo: false, backgroundVideoFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundVideo("synapseOriginal");
  }

  // Init - Synapse X
  if (t.initThemeSynapseX.backgroundMode === "image" && t.initThemeSynapseX.hasStoredBackgroundImage) {
    if (media.initImageX) {
      await idbPutInitBackgroundImage(new Blob([media.initImageX]), "synapseX");
    } else {
      await idbDeleteInitBackgroundImage("synapseX");
      t.initThemeSynapseX = { ...t.initThemeSynapseX, hasStoredBackgroundImage: false, backgroundImageFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundImage("synapseX");
  }

  if (t.initThemeSynapseX.backgroundMode === "video" && t.initThemeSynapseX.hasStoredVideo) {
    if (media.initVideoX) {
      await idbPutInitBackgroundVideo(new Blob([media.initVideoX]), "synapseX");
    } else {
      await idbDeleteInitBackgroundVideo("synapseX");
      t.initThemeSynapseX = { ...t.initThemeSynapseX, hasStoredVideo: false, backgroundVideoFilename: null };
    }
  } else {
    await idbDeleteInitBackgroundVideo("synapseX");
  }

  return normalizeTheme(t);
}

export async function importThemePackFromFile(
  file: File,
): Promise<{ ok: true; warnings: string[] } | { ok: false; error: string }> {
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Could not read file." };
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(raw);
  } catch {
    return { ok: false, error: "Invalid ZIP archive." };
  }

  const byPath = indexZipEntries(entries);
  const manifestBytes = byPath.get(ZIP_MANIFEST);
  const themeBytes = byPath.get(ZIP_THEME);
  if (!manifestBytes?.length || !themeBytes?.length) {
    return { ok: false, error: "Pack must contain manifest.json and theme.json." };
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(manifestBytes));
  } catch {
    return { ok: false, error: "Invalid manifest.json." };
  }

  if (!manifest || typeof manifest !== "object") {
    return { ok: false, error: "Invalid manifest.json." };
  }
  const mf = manifest as Record<string, unknown>;
  if (mf.format !== THEME_PACK_FORMAT) {
    return { ok: false, error: "This file is not a Synapse Framework theme pack." };
  }
  const ver = Number(mf.version);
  if (!Number.isFinite(ver) || ver < 1 || ver > THEME_PACK_VERSION) {
    return {
      ok: false,
      error: `Unsupported pack version (this app supports packs v1–v${THEME_PACK_VERSION}).`,
    };
  }

  let parsedTheme: unknown;
  try {
    parsedTheme = JSON.parse(strFromU8(themeBytes));
  } catch {
    return { ok: false, error: "Invalid theme.json (could not parse JSON)." };
  }

  if (!parsedTheme || typeof parsedTheme !== "object" || Array.isArray(parsedTheme)) {
    return { ok: false, error: "theme.json must contain a theme object." };
  }
  if (Object.keys(parsedTheme as object).length === 0) {
    return { ok: false, error: "theme.json is empty." };
  }

  let normalized: ShellThemeState;
  try {
    normalized = normalizeTheme(parsedTheme);
  } catch {
    return { ok: false, error: "theme.json could not be normalized." };
  }

  const manifestWarnings = Array.isArray(mf.warnings)
    ? mf.warnings.filter((w): w is string => typeof w === "string")
    : [];

  const media: MediaPick = {
    mainImage: byPath.get(MEDIA_MAIN_IMAGE),
    mainVideo: byPath.get(MEDIA_MAIN_VIDEO),
    initImage: byPath.get(MEDIA_INIT_IMAGE),
    initVideo: byPath.get(MEDIA_INIT_VIDEO),
    initImageSynapseOriginal: byPath.get(MEDIA_INIT_IMAGE_SYNAPSE_ORIGINAL),
    initVideoSynapseOriginal: byPath.get(MEDIA_INIT_VIDEO_SYNAPSE_ORIGINAL),
    initImageX: byPath.get(MEDIA_INIT_IMAGE_SYNAPSE_X),
    initVideoX: byPath.get(MEDIA_INIT_VIDEO_SYNAPSE_X),
  };

  let withIdb: ShellThemeState;
  try {
    withIdb = await syncIdbFromImportedTheme(normalized, media);
  } catch {
    return { ok: false, error: "Import failed while syncing background media to storage." };
  }
  try {
    applyFullShellTheme(withIdb);
  } catch {
    return { ok: false, error: "Import failed while applying theme to the app." };
  }

  return { ok: true, warnings: manifestWarnings };
}
