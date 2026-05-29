/**
 * Vite is configured with strictPort: true. A leftover Node/Vite process
 * holding 5173 makes startup fail non-deterministically; free it before dev/preview.
 */
import { execSync } from 'node:child_process'
import os from 'node:os'

/** @param {number} port */
export function ensureListenPortFree(port) {
  if (os.platform() === 'win32') {
    freeWindows(port)
  } else {
    freeUnix(port)
  }
}

/** @param {number} port */
function freeWindows(port) {
  let out
  try {
    out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true })
  } catch {
    return
  }
  const portToken = `:${port}`
  const pids = new Set()
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue
    if (!line.includes(portToken)) continue
    const parts = line.trim().split(/\s+/)
    const last = parts[parts.length - 1]
    if (/^\d+$/.test(last)) pids.add(last)
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe', windowsHide: true })
      console.warn(`[dev] Freed port ${port} (stopped PID ${pid}).`)
    } catch {
      // ignore — race or already exited
    }
  }
}

/** @param {number} port */
function freeUnix(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
    })
    const pids = out
      .trim()
      .split('\n')
      .filter(Boolean)
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGKILL')
        console.warn(`[dev] Freed port ${port} (stopped PID ${pid}).`)
      } catch {
        // ignore
      }
    }
  } catch {
    // nothing listening or lsof unavailable
  }
}
