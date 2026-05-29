import { spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const windowsSetup =
  'call "H:\\Development\\visual studio\\vs\\Common7\\Tools\\VsDevCmd.bat" -arch=amd64 -host_arch=amd64 && tauri dev'

const child = isWindows
  ? spawn('cmd.exe', ['/d', '/s', '/c', windowsSetup], { stdio: 'inherit' })
  : spawn('tauri', ['dev'], { stdio: 'inherit' })

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
