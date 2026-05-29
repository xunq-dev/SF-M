/**
 * Regenerates ui-export/ — a contributor-facing snapshot of each UI shell.
 * Run: npm run export:ui
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "ui-export");

/** @type {{ exportPath: string; sourcePath: string }[]} */
const manifestEntries = [];

function ensureDir(rel) {
  mkdirSync(join(out, rel), { recursive: true });
}

function recordCopy(fromRel, toRel) {
  manifestEntries.push({
    exportPath: toRel.replace(/\\/g, "/"),
    sourcePath: fromRel.replace(/\\/g, "/"),
  });
}

function copyDir(fromRel, toRel) {
  const from = join(root, fromRel);
  if (!existsSync(from)) return;
  ensureDir(toRel);
  cpSync(from, join(out, toRel), { recursive: true });
  recordCopy(fromRel, toRel);
}

function copyFile(fromRel, toRel) {
  const from = join(root, fromRel);
  if (!existsSync(from)) return;
  ensureDir(dirname(toRel));
  cpSync(from, join(out, toRel));
  recordCopy(fromRel, toRel);
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });

const shells = ["V3", "Blue", "OG", "2017", "SynapseX", "Shared"];
for (const name of shells) ensureDir(name);

// ── V3 (full tree incl. dormant / remake-assets) ──────────────────────────
copyDir("src/app/synapse-v3", "V3/app/synapse-v3");

// ── Blue ───────────────────────────────────────────────────────────────────
copyDir("src/app/components", "Blue/app/components");
copyDir("src/app/pages", "Blue/app/pages");
copyFile("src/app/initScreenStorage.ts", "Blue/app/initScreenStorage.ts");
copyFile("src/app/shellChromeContext.tsx", "Blue/app/shellChromeContext.tsx");
copyDir("src/ui", "Blue/ui");
copyDir("src/imports", "Blue/imports");
copyDir("src/assets/logos", "Blue/assets/logos");
if (existsSync(join(root, "logo presets"))) {
  copyDir("logo presets", "Blue/logo presets");
}

// ── OG + 2017 (duplicate Synapse Original shell) ───────────────────────────
for (const dest of ["OG", "2017"]) {
  copyDir("src/app/synapse-original", `${dest}/app/synapse-original`);
  copyDir("src/assets/synapse-original", `${dest}/assets/synapse-original`);
}

// ── Synapse X ──────────────────────────────────────────────────────────────
copyDir("src/app/synapse-x", "SynapseX/app/synapse-x");
copyDir("src/assets/synapse-x", "SynapseX/assets/synapse-x");
copyDir("src/assets/synapse-original", "SynapseX/assets/synapse-original");

// ── Shared cross-shell deps ────────────────────────────────────────────────
copyDir("src/editor", "Shared/editor");
copyDir("src/styles", "Shared/styles");
copyDir("src/app/liveEdit", "Shared/app/liveEdit");
copyDir("src/app/components/ui", "Shared/app/components/ui");
copyDir("src/app/components/figma", "Shared/app/components/figma");
copyDir("src/app/components/confirmation", "Shared/app/components/confirmation");
copyDir("src/app/components/settings", "Shared/app/components/settings");
copyDir("src/app/hooks", "Shared/app/hooks");
copyDir("src/app/util", "Shared/app/util");
copyDir("src/app/editorWorkspace", "Shared/app/editorWorkspace");
copyDir("src/app/executorBridge", "Shared/app/executorBridge");
copyDir("src/app/scriptHub", "Shared/app/scriptHub");
copyDir("src/app/scripts", "Shared/app/scripts");
copyDir("src/assets/script-hub", "Shared/assets/script-hub");
copyDir("src/assets/logos", "Shared/assets/logos");
copyDir("src/assets/editor-sidebar-scripts", "Shared/assets/editor-sidebar-scripts");

const sharedUiFiles = ["ShellLiveEditContext.tsx", "shellLiveEditRegistry.ts", "idbVideo.ts"];
for (const f of sharedUiFiles) copyFile(`src/ui/${f}`, `Shared/ui/${f}`);

const sharedAppFiles = [
  "appSettings.ts",
  "useAppSettings.ts",
  "tauriEnv.ts",
  "windowConstraints.ts",
  "windowPlacement.ts",
  "editorClearDialog.ts",
  "openExternalUrl.ts",
  "integratedSiteWebview.ts",
  "dialogWindowPlacement.ts",
  "altShellBootPath.ts",
  "crossWindowSync.ts",
  "App.tsx",
  "routes.tsx",
];
for (const f of sharedAppFiles) copyFile(`src/app/${f}`, `Shared/app/${f}`);

copyFile("src/main.tsx", "Shared/main.tsx");
copyFile("src/branding.ts", "Shared/branding.ts");
copyFile("src/vite-env.d.ts", "Shared/vite-env.d.ts");
copyFile("src/imports/svg-bj8q31w0fn.ts", "Shared/imports/svg-bj8q31w0fn.ts");

manifestEntries.sort((a, b) => a.exportPath.localeCompare(b.exportPath));

writeFileSync(
  join(out, "export-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      generator: "scripts/export-ui.mjs",
      entryCount: manifestEntries.length,
      entries: manifestEntries,
    },
    null,
    2,
  ),
);

writeFileSync(
  join(out, "README.md"),
  `# UI Export

Contributor snapshot of Synapse Framework UI shells. **Reference only** — the live app lives in \`src/\`. Regenerate with \`npm run export:ui\`.

See **PORTING.md** for merge steps into another codebase (e.g. macOS). See **export-manifest.json** for every \`exportPath\` → \`sourcePath\` mapping.

## Folders

| Folder | Shell | \`uiMode\` | Routes |
|--------|-------|----------|--------|
| **Blue/** | Synapse Blue | \`default\` | \`/\`, \`/script-hub\`, \`/settings\`, … |
| **OG/** | Synapse OG (2017) | \`synapseOriginal\` | \`/synapse-original/*\` |
| **2017/** | Synapse 2017 | \`synapseOriginal\` | \`/synapse-original/*\` |
| **SynapseX/** | Synapse X | \`synapseX\` | \`/synapse-x/*\` |
| **V3/** | Synapse V3 (default) | \`synapseV3\` | \`/synapse-v3/*\` |
| **Shared/** | Cross-shell deps | — | Editor, bridge, script hub, live edit, styles |

## Notes

- **OG** and **2017** are identical Synapse Original copies — work under whichever name you prefer.
- **V3** includes \`components/dormant/\` (WIP panels kept out of the main build where possible).
- Files use \`@\` path aliases from the main Vite project; this folder is not a standalone build.
- Map back to source: \`ui-export/Blue/app/pages/SettingsPage.tsx\` → \`src/app/pages/SettingsPage.tsx\`, etc.

## Layout

\`\`\`
ui-export/
├── README.md
├── PORTING.md
├── export-manifest.json
├── Shared/     editor, styles, bridge, workspace, liveEdit, app infra
├── Blue/       MainLayout, pages, shell theme (src/ui), imports, logos
├── OG/         app/synapse-original + assets/synapse-original
├── 2017/       same as OG
├── SynapseX/   app/synapse-x + assets
└── V3/         full synapse-v3 tree + remake-assets
\`\`\`
`,
);

writeFileSync(
  join(out, "PORTING.md"),
  `# Porting ui-export to another project

This tree is a **UI-only snapshot**. It does not include \`src-tauri/\`, Vite config, or \`package.json\`. Full Windows builds always use the canonical repo (\`src/\` + \`src-tauri/\`).

## Requirements in the target project

- React 18+ and the same npm deps as Synapse (\`@monaco-editor/react\`, \`react-router\`, Radix UI, etc.) — see root \`package.json\`.
- Vite (or equivalent) with a \`@\` alias pointing at the target \`src/\` directory (same as this repo's \`vite.config.ts\`).

## Folder → canonical source

| ui-export | Merge into |
|-----------|------------|
| \`V3/app/synapse-v3/\` | \`src/app/synapse-v3/\` |
| \`Blue/app/pages/\` | \`src/app/pages/\` |
| \`Blue/app/components/\` | \`src/app/components/\` |
| \`Blue/ui/\` | \`src/ui/\` |
| \`OG/app/synapse-original/\` or \`2017/app/synapse-original/\` | \`src/app/synapse-original/\` |
| \`SynapseX/app/synapse-x/\` | \`src/app/synapse-x/\` |
| \`Shared/editor/\` | \`src/editor/\` |
| \`Shared/app/scripts/\` | \`src/app/scripts/\` |
| \`Shared/app/*\` (other) | \`src/app/*\` (same relative path) |

Use \`export-manifest.json\` for the complete file list. Each entry has \`exportPath\` (under \`ui-export/\`) and \`sourcePath\` (under repo root).

## Suggested merge checklist

1. Copy **Shared/** files into matching \`src/\` paths first (bridge, editor, workspace).
2. Copy the shell folder you need (V3, Blue, OG, or SynapseX).
3. Resolve import paths — keep \`@/app/...\`, \`@/editor/...\` style imports.
4. Wire routes in \`src/app/routes.tsx\` if the target app differs.
5. Run the target app's build; fix any missing assets under \`src/assets/\`.

## Regenerating this export

From the Synapse repo root:

\`\`\`bash
npm run export:ui
\`\`\`

Do not hand-edit \`ui-export/\`; changes will be overwritten on the next export.
`,
);

console.log(`ui-export/ written (${manifestEntries.length} top-level copy rules, see export-manifest.json)`);
