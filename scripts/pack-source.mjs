/**
 * Creates a small source zip from source.manifest.json (include-only — never packs target/node_modules).
 * Run: npm run source:pack
 * Default includes ui-export/ (regenerates via export:ui if missing).
 * Optional: --no-ui-export  --with-logos  --all
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "source.manifest.json"), "utf8"));
const outZip = join(root, "synapse-source-small.zip");

const args = process.argv.slice(2);
const withUiExport = !args.includes("--no-ui-export");
const withLogos = args.includes("--with-logos") || args.includes("--all");

if (withUiExport && !existsSync(join(root, "ui-export"))) {
  console.log("ui-export/ missing — running npm run export:ui …");
  const ex = spawnSync("npm", ["run", "export:ui"], { cwd: root, stdio: "inherit", shell: true });
  if (ex.status !== 0) process.exit(ex.status ?? 1);
}

const staging = join(tmpdir(), `synapse-pack-${Date.now()}`);
mkdirSync(staging, { recursive: true });

function copyIntoStaging(rel) {
  const from = join(root, rel);
  if (!existsSync(from)) {
    console.warn(`skip missing: ${rel}`);
    return;
  }
  const to = join(staging, rel);
  mkdirSync(dirname(to), { recursive: true });
  const st = statSync(from);
  if (st.isDirectory()) {
    cpSync(from, to, { recursive: true });
  } else {
    cpSync(from, to);
  }
}

const includePaths = [
  ...(manifest.requiredFiles ?? []),
  ...(manifest.requiredTauriFiles ?? []),
  ...(manifest.requiredDirectories ?? []),
  "package.json",
  "package-lock.json",
];

if (withLogos) includePaths.push("logo presets");
if (withUiExport) includePaths.push("ui-export");

for (const rel of [...new Set(includePaths)]) {
  copyIntoStaging(rel);
}

// Porter note inside the archive
writeFileSync(
  join(staging, "EXTRACT_AND_BUILD.txt"),
  [
    "Synapse Framework — small source archive",
    "",
    "This zip intentionally excludes:",
    "  - node_modules/     -> run: npm install",
    "  - dist/             -> run: npm run build",
    "  - src-tauri/target/ -> run: npm run tauri:build",
    "",
    withUiExport
      ? "ui-export/ is included for UI porting."
      : "ui-export/ is NOT included. After extract run: npm run export:ui",
    "",
    "Verify: npm run source:verify",
    "Build:  npm install && npm run build && npm run tauri:build",
    "",
  ].join("\n"),
);

if (existsSync(outZip)) rmSync(outZip, { force: true });

const tar = spawnSync(
  "tar",
  ["-a", "-c", "-f", outZip, "-C", staging, "."],
  { stdio: "inherit" },
);

rmSync(staging, { recursive: true, force: true });

if (tar.status !== 0) {
  console.error("tar pack failed.");
  process.exit(tar.status ?? 1);
}

const mb = (statSync(outZip).size / (1024 * 1024)).toFixed(2);
const flags = [withUiExport && "ui-export", withLogos && "logo presets"].filter(Boolean).join(", ");
console.log(
  `Created ${outZip} (${mb} MB)${flags ? ` [+ ${flags}]` : withUiExport ? " [source + ui-export]" : " [build source only — use --no-ui-export to omit ui-export]"}`,
);
