import type { ShellType } from './shell'

// ============================================================
// Shell Configuration Data (stored in rcland.config.shell.json)
// ============================================================

export interface ShellConfigData {
  version: 1
  variables: ShellVariable[]
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
  order: number
  shells?: ShellType[]
}

/** PATH entry */
export interface PathEntry {
  id: string
  path: string
  description?: string
  enabled: boolean
  order: number
  shells?: ShellType[]
}

/** Shell function with per-shell bodies */
export interface ShellFunction {
  id: string
  name: string
  category: string
  description?: string
  body: {
    zsh?: string
    bash?: string
    powershell?: string
  }
  enabled: boolean
  order: number
}

/** Command alias */
export interface ShellAlias {
  id: string
  alias: string
  command: string
  description?: string
  enabled: boolean
  order: number
  shells?: ShellType[]
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

// ============================================================
// Factory Helpers
// ============================================================

export function createEmptyShellConfig(): ShellConfigData {
  return {
    version: 1,
    variables: [],
    pathEntries: [],
    functions: [],
    aliases: [],
    prompt: { type: 'simple' },
    output: { profiles: {} }
  }
}

export function createEmptyVariable(): ShellVariable {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
    encrypted: false,
    enabled: true,
    order: 0
  }
}

export function createEmptyPathEntry(): PathEntry {
  return {
    id: crypto.randomUUID(),
    path: '',
    enabled: true,
    order: 0
  }
}

export function createEmptyFunction(): ShellFunction {
  return {
    id: crypto.randomUUID(),
    name: '',
    category: 'custom',
    body: {},
    enabled: true,
    order: 0
  }
}

export function createEmptyAlias(): ShellAlias {
  return {
    id: crypto.randomUUID(),
    alias: '',
    command: '',
    enabled: true,
    order: 0
  }
}
