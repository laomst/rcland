import type { ShellType } from './shell'

// ============================================================
// Shell Configuration Data (stored in rcland.config.shell.json)
// ============================================================

export interface ShellConfigData {
  version: 2
  variables: ShellVariable[]
  pathVariables: PathVariable[]
  pathEntries: PathEntry[]
  functions: ShellFunction[]
  aliases: ShellAlias[]
  prompt: PromptConfig
  output: OutputConfig
}

/** Environment variable */
export interface ShellVariable {
  id: string
  key: string
  value: string
  encrypted: boolean
  description?: string
  enabled: boolean
  shells?: ShellType[]
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
}

/** Path variable (resolved at generation time, not exported as shell variable) */
export interface PathVariable {
  id: string
  key: string
  value: string
  description?: string
  enabled: boolean
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
}

/** PATH entry */
export interface PathEntry {
  id: string
  path: string
  description?: string
  enabled: boolean
  shells?: ShellType[]
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
}

/** Shell function with per-shell bodies */
export interface ShellFunction {
  id: string
  /** 内部标识名称（显示用） */
  name: string
  category: string
  description?: string
  /** 每种 shell 的完整函数代码 */
  body: {
    zsh?: string
    bash?: string
    powershell?: string
  }
  /** 从代码中提取的函数名（每种 shell 可能不同） */
  funcNames?: {
    zsh?: string
    bash?: string
    powershell?: string
  }
  enabled: boolean
  /** 内置函数标记，不可删除/编辑 */
  builtIn?: boolean
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
}

/** Command alias */
export interface ShellAlias {
  id: string
  alias: string
  command: string
  description?: string
  enabled: boolean
  shells?: ShellType[]
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
}

/** Prompt configuration */
export interface PromptConfig {
  type: 'simple' | 'git' | 'custom'
  simpleFormat?: string
  gitFormat?: string
  customTemplate?: {
    zsh?: string
    bash?: string
    powershell?: string
  }
}

/** Output configuration */
export interface OutputConfig {
  profiles: {
    [shell in ShellType]?: {
      outputPath: string
      rcPath: string
      autoSource: boolean
    }
  }
}

// ============================================================
// Conflict Detection Types
// ============================================================

export interface ConflictCheckResult {
  warnings: ConflictWarning[]
  errors: ConflictError[]
}

export interface ConflictWarning {
  type: 'alias-shadows-command' | 'duplicate-path' | 'unused-variable-ref'
  message: string
  itemIds: string[]
}

export interface ConflictError {
  type: 'duplicate-var-key' | 'alias-func-conflict' | 'duplicate-alias'
  message: string
  itemIds: string[]
}

// ============================================================
// Backup Types
// ============================================================

export interface BackupEntry {
  id: string
  shellType: ShellType
  timestamp: string
  filePath: string
  originalPath: string
  sizeBytes: number
}
