export type ShellType = 'zsh' | 'bash' | 'powershell'

export const ALL_SHELL_TYPES: ShellType[] = ['zsh', 'bash', 'powershell']

export interface ShellProfileConfig {
  enabled: boolean
  profilePath: string
  outputPath: string
  autoSource: boolean
}

export const SHELL_DEFAULTS: Record<ShellType, { profilePath: string; outputFileExt: string }> = {
  zsh:        { profilePath: '~/.zshrc',                       outputFileExt: '.zsh'  },
  bash:       { profilePath: '~/.bashrc',                      outputFileExt: '.sh'   },
  powershell: { profilePath: '$PROFILE',                       outputFileExt: '.ps1'  },
}

export const SHELL_LABELS: Record<ShellType, string> = {
  zsh:        'Zsh',
  bash:       'Bash',
  powershell: 'PowerShell',
}

/** OS platform → supported shells */
export const SHELL_OS_SUPPORT: Record<string, ShellType[]> = {
  darwin: ['zsh', 'bash'],
  win32:  ['powershell'],
  linux:  ['bash', 'zsh'],
}
