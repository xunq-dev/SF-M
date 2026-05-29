import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { join } from 'node:path'
import { ensureListenPortFree } from './ensure-dev-port.mjs'

const isPreview = process.argv.includes('preview')
const devPort = isPreview ? 4173 : 5173
ensureListenPortFree(devPort)

const root = fs.realpathSync.native(process.cwd())
process.chdir(root)

if (!isPreview) {
  console.log(`
  Synapse: this only starts the Vite dev server (http://127.0.0.1:5173/).
  To open the desktop window, run in another terminal from this project folder:

    npm run tauri:dev

  Keep this terminal open — the dev server runs in the foreground (not frozen).
`)
}

const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [viteCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
