/**
 * Prints workspace size breakdown and warns about non-source bloat.
 * Run: npm run source:measure
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else total += statSync(full).size;
    }
  }
  return total;
}

const rows = [];
for (const name of readdirSync(root)) {
  if (name === "." || name === "..") continue;
  const full = join(root, name);
  const st = statSync(full);
  const bytes = st.isDirectory() ? dirSize(full) : st.size;
  rows.push({ name, bytes });
}
rows.sort((a, b) => b.bytes - a.bytes);

const fmt = (n) => {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GiB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MiB`;
  return `${(n / 1024).toFixed(2)} KiB`;
};

console.log("Workspace size breakdown:\n");
for (const r of rows) {
  console.log(`  ${fmt(r.bytes).padStart(10)}  ${r.name}`);
}

const target = join(root, "src-tauri", "target");
const nm = join(root, "node_modules");
const total = rows.reduce((s, r) => s + r.bytes, 0);
console.log(`\n  ${fmt(total).padStart(10)}  TOTAL (entire folder)\n`);

const bloat = [];
if (existsSync(target) && dirSize(target) > 50 * 1024 * 1024) {
  bloat.push(`src-tauri/target (${fmt(dirSize(target))})`);
}
if (existsSync(nm) && dirSize(nm) > 10 * 1024 * 1024) {
  bloat.push(`node_modules (${fmt(dirSize(nm))})`);
}

if (bloat.length) {
  console.log("NOT part of small source (exclude when sharing):");
  for (const b of bloat) console.log(`  - ${b}`);
  console.log("\nDo NOT zip the whole project folder — that is why you see ~2+ GiB.");
  console.log("Remove artifacts locally:  npm run clean");
  console.log("Small shareable zip:       npm run source:pack   (~11–15 MiB)\n");
} else {
  console.log("No large build artifacts detected.");
  console.log("Small shareable zip: npm run source:pack\n");
}
