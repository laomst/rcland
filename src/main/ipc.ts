import { ipcMain } from 'electron'
import { registerConfigHandlers } from './ipc/config-handlers'
import { registerCryptoHandlers } from './ipc/crypto-handlers'
import { registerShellHandlers } from './ipc/shell-handlers'
import { readOsProxy } from './services/os-proxy-reader'

export function registerIpcHandlers(): void {
  registerConfigHandlers()
  registerCryptoHandlers()
  registerShellHandlers()

  ipcMain.handle('system-proxy:read-os', () => readOsProxy())
}
