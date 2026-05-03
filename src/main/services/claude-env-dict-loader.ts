import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { ClaudeEnvDictFile } from '@shared/types/claude-env-dict'
import { createEmptyClaudeEnvDictFile } from '@shared/types/claude-env-dict'

/**
 * 纯函数：从指定路径加载字典文件。
 * 文件不存在/损坏/版本不匹配时返回空结构。
 * 容忍缺字段：缺 userItems 视为 []，缺 builtInOverrides 视为 {}。
 */
export function loadClaudeEnvDictFileFrom(filePath: string): ClaudeEnvDictFile {
  if (!existsSync(filePath)) return createEmptyClaudeEnvDictFile()
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<ClaudeEnvDictFile>
    if (parsed?.version !== 1) return createEmptyClaudeEnvDictFile()
    return {
      version: 1,
      userItems: Array.isArray(parsed.userItems) ? parsed.userItems : [],
      builtInOverrides: parsed.builtInOverrides && typeof parsed.builtInOverrides === 'object'
        ? parsed.builtInOverrides
        : {}
    }
  } catch {
    return createEmptyClaudeEnvDictFile()
  }
}

export function saveClaudeEnvDictFileTo(filePath: string, data: ClaudeEnvDictFile): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
