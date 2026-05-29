import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const monacoEditorPlugin = require('vite-plugin-monaco-editor').default as (
  opts?: Record<string, unknown>,
) => import('vite').Plugin

// Node 25 removed rmdirSync recursive option. Monaco plugin still calls it.
// Keep behavior by forwarding recursive rmdir calls to rmSync.
const originalRmdirSync = fs.rmdirSync.bind(fs)
;(fs as typeof import('node:fs') & {
  rmdirSync: typeof fs.rmdirSync
}).rmdirSync = ((targetPath: fs.PathLike, options?: fs.RmDirOptions) => {
  if (
    options &&
    typeof options === 'object' &&
    'recursive' in options &&
    options.recursive
  ) {
    fs.rmSync(targetPath, { recursive: true, force: true })
    return
  }

  return originalRmdirSync(targetPath, options)
}) as typeof fs.rmdirSync

// SUBST/junctions can make cwd (e.g. C:\...\project) differ from realpath
// (e.g. H:\project). Vite's HTML emit uses path.relative(root, id); across
// drive letters that becomes an absolute path and Rollup rejects it.
const projectRoot = fs.realpathSync.native(
  path.dirname(fileURLToPath(import.meta.url)),
)

export default defineConfig({
  root: projectRoot,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    clearScreen: false,
    proxy: {
      // Same-origin path for ScriptBlox API during `npm run dev` (avoids browser CORS).
      '/scriptblox-api': {
        target: 'https://scriptblox.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/scriptblox-api/, ''),
      },
    },
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'json'],
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.join(projectRoot, 'src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
