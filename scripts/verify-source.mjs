/**
 * Verifies that all paths in source.manifest.json exist (full build tree).
 * Run: npm run source:verify
 * Optional: --build (npm run build), --tauri (npm run tauri:build, needs VS toolchain)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "source.manifest.json"), "utf8"));

const missing = [];

for (const rel of manifest.requiredFiles ?? []) {
  if (!existsSync(join(root, rel))) missing.push(rel);
}

for (const rel of manifest.requiredTauriFiles ?? []) {
  if (!existsSync(join(root, rel))) missing.push(rel);
}

for (const rel of manifest.requiredDirectories ?? []) {
  if (!existsSync(join(root, rel))) missing.push(`${rel}/`);
}

if (missing.length > 0) {
  console.error("source:verify FAILED — missing paths:\n");
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("source:verify OK — all required manifest paths present.");

const args = process.argv.slice(2);
if (args.includes("--build") || args.includes("--tauri")) {
  console.log("Running npm run build...");
  const build = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

if (args.includes("--tauri")) {
  console.log("Running npm run tauri:build (requires Visual Studio link.exe)...");
  const tauri = spawnSync("npm", ["run", "tauri:build"], { cwd: root, stdio: "inherit", shell: true });
  if (tauri.status !== 0) process.exit(tauri.status ?? 1);
}
