import wordmarkUrl from "../assets/logos/wordmark.png?url";
import synapseIconUrl from "../assets/logos/synapse-icon.png?url";
import synapseXLogoUrl from "../assets/synapse-x/logo.svg?url";
import synapseOriginalLogoUrl from "../assets/synapse-original/synapse-logo.png?url";

/**
 * Project folder `logo presets/` (repo root) — Synapse mark variants for the top bar.
 * @see folder `logo presets` in the workspace
 */
const logoPresetsDirGlob = import.meta.glob<string>("../../logo presets/**/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});

export type TopBarLogoPresetId = string;

function fileNameFromGlobPath(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/** Stable id from filename stem (matches files in `logo presets/`). */
function idFromLogoFileName(file: string): string {
  const base = fileNameFromGlobPath(file).replace(/\.(png|svg)$/i, "");
  const lower = base.toLowerCase();
  if (lower === "wordmark" || lower === "synapselogo") return "wordmark";
  if (lower === "synapse-icon" || lower === "synapseicon") return "synapse-icon";
  const slug = base
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "wordmark";
}

function titleFromFileBase(base: string): string {
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const PRESET_META: Record<string, { label: string; description: string }> = {
  wordmark: { label: "Wordmark", description: "Classic Synapse banner" },
  "synapse-icon": { label: "Icon mark", description: "Colorful S mark (legacy)" },
  icon2: { label: "Icon mark (v2)", description: "Colorful S mark — default app icon" },
  framework: { label: "Framework wordmark", description: "SYNAPSE Framework banner" },
  "synapse-x": { label: "Synapse X", description: "Modern X logo" },
  synapseOriginal: { label: "Synapse Original (2017)", description: "Legacy OG logo" },
};

/** Nearly square marks — use a compact top-bar frame instead of the wide wordmark strip. */
export const TOP_BAR_ICON_MARK_PRESET_IDS = new Set<TopBarLogoPresetId>(["synapse-icon", "icon2"]);

export function isTopBarIconMarkPreset(id: string): boolean {
  return TOP_BAR_ICON_MARK_PRESET_IDS.has(id);
}

function buildPresets(): ReadonlyArray<{
  id: TopBarLogoPresetId;
  label: string;
  description: string;
  url: string;
}> {
  const merged: Record<string, { id: string; label: string; description: string; url: string }> = {};

  function insert(id: string, url: string, label: string, description: string) {
    if (!merged[id]) merged[id] = { id, label, description, url };
  }

  insert("wordmark", wordmarkUrl, PRESET_META.wordmark.label, PRESET_META.wordmark.description);
  insert(
    "synapse-icon",
    synapseIconUrl,
    PRESET_META["synapse-icon"].label,
    PRESET_META["synapse-icon"].description,
  );
  insert(
    "synapse-x",
    synapseXLogoUrl,
    PRESET_META["synapse-x"].label,
    PRESET_META["synapse-x"].description,
  );
  insert(
    "synapseOriginal",
    synapseOriginalLogoUrl,
    PRESET_META.synapseOriginal.label,
    PRESET_META.synapseOriginal.description,
  );

  for (const [path, url] of Object.entries(logoPresetsDirGlob)) {
    if (typeof url !== "string") continue;
    const file = fileNameFromGlobPath(path);
    const id = idFromLogoFileName(file);
    const base = file.replace(/\.png$/i, "");
    if (id === "wordmark" || id === "synapse-icon" || id === "synapse-x" || id === "synapseOriginal") continue;
    const meta = PRESET_META[id];
    const label = meta?.label ?? titleFromFileBase(base);
    const description = meta?.description ?? "Logo preset";
    insert(id, url, label, description);
  }

  const out = Object.values(merged);
  out.sort((a, b) => {
    const rank = (id: string) =>
      id === "framework"
        ? 0
        : id === "wordmark"
          ? 1
          : id === "icon2"
            ? 2
            : id === "synapse-icon"
              ? 3
              : 4;
    const d = rank(a.id) - rank(b.id);
    return d !== 0 ? d : a.label.localeCompare(b.label);
  });
  return out;
}

export const TOP_BAR_LOGO_PRESETS = buildPresets();

const PRESET_BY_ID = new Map(TOP_BAR_LOGO_PRESETS.map((p) => [p.id, p] as const));

export function isTopBarLogoPresetId(id: string): boolean {
  return PRESET_BY_ID.has(id);
}

export const SYNAPSE_LOGO_URL = PRESET_BY_ID.get("wordmark")?.url ?? TOP_BAR_LOGO_PRESETS[0]?.url ?? "";

export const SYNAPSE_ICON_URL = PRESET_BY_ID.get("synapse-icon")?.url ?? SYNAPSE_LOGO_URL;

export function resolveTopBarLogoUrl(theme: {
  logoDataUrl: string | null;
  topBarLogoPreset: string;
}): string {
  if (theme.logoDataUrl) return theme.logoDataUrl;
  const p = PRESET_BY_ID.get(theme.topBarLogoPreset);
  return p?.url ?? SYNAPSE_LOGO_URL;
}
