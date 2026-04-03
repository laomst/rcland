import { platform } from 'os'
import type { ShellType } from '../../shared/shell'

export function detectShell(): ShellType {
  const os = platform()

  if (os === 'win32') {
    return 'powershell'
  }

  // macOS / Linux
  const shell = process.env.SHELL || ''
  if (shell.includes('zsh'))  return 'zsh'
  if (shell.includes('fish')) return 'fish'
  if (shell.includes('bash')) return 'bash'

  return os === 'darwin' ? 'zsh' : 'bash'
}
