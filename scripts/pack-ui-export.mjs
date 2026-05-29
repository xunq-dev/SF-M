/**
 * Regenerates ui-export/ then zips it for porters (macOS, etc.).
 * Run: npm run source:pack:ui
 */
import { existsSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outZip = join(root, "synapse-ui-export.zip");

spawnSync("node", ["./scripts/export-ui.mjs"], { cwd: root, stdio: "inherit", shell: true });

if (existsSync(outZip)) rmSync(outZip, { force: true });

const tar = spawnSync("tar", ["-a", "-c", "-f", outZip, "-C", root, "ui-export"], { stdio: "inherit" });
if (tar.status !== 0) process.exit(tar.status ?? 1);

const mb = (statSync(outZip).size / (1024 * 1024)).toFixed(2);
console.log(`Created ${outZip} (${mb} MB)`);
