import type { ShellType } from '../../../shared/shell'
import type { GenerateContext } from './section-types'
import * as cryptoService from '../crypto'

import { isEncrypted } from '../crypto'

/**
 * Escape a value for use inside double quotes in bash/zsh.
 * Handles: \ " ` $ !
 */
export function escapeForBashLike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/!/g, '\\!')
}

/**
 * Escape a value for use inside single quotes in PowerShell.
 * Single quotes in PowerShell only need '' to represent a literal '.
 */
export function escapeForPowerShell(value: string): string {
  return value.replace(/'/g, "''")
}

/** Create a GenerateContext for a specific shell type */
export function createGenerateContext(
  shellType: ShellType,
  keyPassphrase: string
): GenerateContext {
  const escapeFn = shellType === 'powershell' ? escapeForPowerShell : escapeForBashLike

  return {
    shellType,
    decrypt(value: string): string {
      if (isEncrypted(value)) {
        return cryptoService.decrypt(value, keyPassphrase)
      }
      return value
    },
    escapeValue(value: string): string {
      return escapeFn(value)
    },
    timestamp: new Date().toLocaleString('zh-CN')
  }
}
