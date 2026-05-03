export type ClaudeEnvDictCategory =
  | 'model'
  | 'thinking'
  | 'request'
  | 'privacy'
  | 'cache'
  | 'custom'

export type ClaudeEnvDictDescription =
  | { type: 'i18n'; key: string }
  | { type: 'plain'; text: string }

/** 字典条目运行时形态（合并后） */
export interface ClaudeEnvDictItem {
  /** 环境变量名，唯一主键 */
  key: string
  category: ClaudeEnvDictCategory
  /** 来自代码预制 = true，用户自定义 = false */
  builtIn: boolean
  /** 创建新 Provider 时是否默认填入模板 */
  defaultInTemplate: boolean
  exampleValue?: string
  description: ClaudeEnvDictDescription
}

/** 用户自定义条目（仅写入文件） */
export interface UserClaudeEnvDictItem {
  key: string
  category: ClaudeEnvDictCategory
  defaultInTemplate: boolean
  exampleValue?: string
  description: string
}

/** 内置条目用户覆盖项（仅可改 defaultInTemplate） */
export interface BuiltInOverride {
  defaultInTemplate?: boolean
}

/** 持久化文件结构 */
export interface ClaudeEnvDictFile {
  version: 1
  userItems: UserClaudeEnvDictItem[]
  builtInOverrides: Record<string, BuiltInOverride>
}

export function createEmptyClaudeEnvDictFile(): ClaudeEnvDictFile {
  return { version: 1, userItems: [], builtInOverrides: {} }
}

/** Env var key 合法性校验：[A-Za-z_][A-Za-z0-9_]* */
export function isValidEnvVarKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
}
