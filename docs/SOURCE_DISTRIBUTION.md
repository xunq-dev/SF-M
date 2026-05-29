# Source distribution

Synapse has two related concepts:

1. **Canonical source** — everything required to run `npm run build` and `npm run tauri:build` (`src/`, `src-tauri/`, config files).
2. **`ui-export/`** — an optional, regenerated UI-only snapshot for merging into other projects (e.g. macOS).

## Verify before sharing or releasing

```bash
npm run source:verify
npm install
npm run source:verify:build
```

For a full Windows installer check (Visual Studio toolchain required):

```bash
npm run source:verify -- --tauri
```

Or run `npm run tauri:build` directly after `source:verify:build`.

## Why the folder looks like 2+ GiB

The full workspace on disk includes **build artifacts**:

| Path | Typical size | In small zip? |
|------|--------------|---------------|
| `src-tauri/target/` | ~2 GiB | No — run `tauri:build` after extract |
| `node_modules/` | ~200 MiB | No — run `npm install` |
| `dist/` | ~20 MiB | No — run `npm run build` |

Run `npm run source:measure` to see a breakdown. **Never** right-click → zip the entire project folder.

### Clean the workspace on disk

Build artifacts are gitignored and safe to delete locally:

```bash
npm run clean:dry   # preview
npm run clean       # remove node_modules, dist, target, ui-export, pack zips
```

Then `npm install` and build again when needed. This does not remove any source files.

## Pack a small archive

```bash
npm run source:pack
```

Produces **`synapse-source-small.zip`** (~15 MiB) using an **include-only** copy from `source.manifest.json` (only `src/`, `src-tauri/` source files, configs, and `ui-export/` — never `target` or `node_modules`).

| Command | Contents |
|---------|----------|
| `npm run source:pack` | Build source + `ui-export/` (default) |
| `npm run source:pack -- --no-ui-export` | Build source only (~5 MiB) |
| `npm run source:pack:full` | + `logo presets/` |
| `npm run source:pack:ui` | Regenerates and zips `ui-export/` only (~8 MiB) |

`ui-export/` is gitignored in git but regenerated on every `npm run tauri:build` / `release` via `build:release`, and included when packing source.

## Manifest

[`source.manifest.json`](../source.manifest.json) lists:

- `requiredFiles` — single files that must exist
- `requiredDirectories` — directories that must exist (checked as a folder, not every file enumerated)
- `requiredTauriFiles` — Rust/Tauri manifest files
- `optionalDirectories` — documented but not required for verify (`logo presets`, `ui-export`)
- `excludeFromPack` — omitted from zip archives

## UI export

Regenerate after UI changes (also runs automatically before `tauri:build`):

```bash
npm run export:ui
```

Outputs:

- `ui-export/README.md` — layout overview
- `ui-export/PORTING.md` — merge checklist for porters
- `ui-export/export-manifest.json` — every copied path with `exportPath` and `sourcePath`

**Do not hand-edit `ui-export/`.** The Vite build always uses `src/`, not `ui-export/`.

## What is not source

| Path | Notes |
|------|--------|
| `node_modules/` | `npm install` |
| `dist/` | `npm run build` |
| `src-tauri/target/` | `tauri:dev` / `tauri:build` |
| `someone-elses-v3-project-workspace/` | Reference copy of another project; not used by Synapse |
