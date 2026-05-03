import { ipcMain } from 'electron'
import { registerConfigHandlers } from './ipc/config-handlers'
import { registerCryptoHandlers } from './ipc/crypto-handlers'
import { registerShellHandlers } from './ipc/shell-handlers'
import { registerClaudeEnvDictHandlers } from './ipc/claude-env-dict-handlers'
import { readOsProxy } from './services/os-proxy-reader'

export function registerIpcHandlers(): void {
  registerConfigHandlers()
  registerCryptoHandlers()
  registerShellHandlers()
  registerClaudeEnvDictHandlers()

  ipcMain.handle('system-proxy:read-os', () => readOsProxy())
}
