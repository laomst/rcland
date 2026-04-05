import { registerConfigHandlers } from './ipc/config-handlers'
import { registerCryptoHandlers } from './ipc/crypto-handlers'
import { registerShellHandlers } from './ipc/shell-handlers'

export function registerIpcHandlers(): void {
  registerConfigHandlers()
  registerCryptoHandlers()
  registerShellHandlers()
}
