export type ShellType = 'zsh' | 'bash' | 'powershell'

export const ALL_SHELL_TYPES: ShellType[] = ['zsh', 'bash', 'powershell']

export interface ShellProfileConfig {
  enabled: boolean
}

export const SHELL_LABELS: Record<ShellType, string> = {
  zsh:        'Zsh',
  bash:       'Bash',
  powershell: 'PowerShell',
}

/** Shell profile path conventions */
const SHELL_PROFILE_PATHS: Record<ShellType, string> = {
  zsh:        '~/.zshrc',
  bash:       '~/.bashrc',
  powershell: '$PROFILE',
}

/** OS platform → supported shells */
export const SHELL_OS_SUPPORT: Record<string, ShellType[]> = {
  darwin: ['zsh', 'bash'],
  win32:  ['powershell'],
  linux:  ['bash', 'zsh'],
}

/** Get the conventional profile path for a shell */
export function getShellProfilePath(shell: ShellType): string {
  return SHELL_PROFILE_PATHS[shell]
}

/** Get the RCLand output path for a shell: ~/.rcland/{shell}rc[.ps1] */
export function getShellOutputPath(shell: ShellType): string {
  const base = `~/.rcland/${shell}rc`
  return shell === 'powershell' ? `${base}.ps1` : base
}

/** 获取当前操作系统支持的 shell 类型（renderer 环境） */
export function getOsSupportedShells(): ShellType[] {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase()
  let os: string
  if (ua.includes('win')) os = 'win32'
  else if (ua.includes('mac')) os = 'darwin'
  else os = 'linux'
  return SHELL_OS_SUPPORT[os] ?? ['zsh']
}
