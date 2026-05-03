import { ipcMain } from 'electron'
import {
  loadClaudeEnvDictFile,
  saveClaudeEnvDictFile
} from '../services/claude-env-dict'
import { mergeClaudeEnvDict } from '@shared/claude-env-dict-merge'
import { BUILT_IN_CLAUDE_ENV_DICT } from '@shared/presets/claude-env-dict/built-in'
import { isValidEnvVarKey } from '@shared/types/claude-env-dict'
import type {
  ClaudeEnvDictItem,
  UserClaudeEnvDictItem,
  BuiltInOverride
} from '@shared/types/claude-env-dict'

function readMerged(): ClaudeEnvDictItem[] {
  return mergeClaudeEnvDict(BUILT_IN_CLAUDE_ENV_DICT, loadClaudeEnvDictFile())
}

function builtInKeySet(): Set<string> {
  return new Set(BUILT_IN_CLAUDE_ENV_DICT.map((b) => b.key))
}

export function registerClaudeEnvDictHandlers(): void {
  ipcMain.handle('claude-env-dict:read', () => readMerged())

  ipcMain.handle('claude-env-dict:add-user-item', (_e, item: UserClaudeEnvDictItem) => {
    if (!isValidEnvVarKey(item.key)) {
      throw new Error(`Invalid env var key: ${item.key}`)
    }
    if (builtInKeySet().has(item.key)) {
      throw new Error(`Key conflicts with built-in: ${item.key}`)
    }
    const file = loadClaudeEnvDictFile()
    if (file.userItems.some((u) => u.key === item.key)) {
      throw new Error(`User item already exists: ${item.key}`)
    }
    file.userItems.push(item)
    saveClaudeEnvDictFile(file)
    return readMerged()
  })

  ipcMain.handle('claude-env-dict:update-user-item', (_e, item: UserClaudeEnvDictItem) => {
    if (!isValidEnvVarKey(item.key)) {
      throw new Error(`Invalid env var key: ${item.key}`)
    }
    const file = loadClaudeEnvDictFile()
    const idx = file.userItems.findIndex((u) => u.key === item.key)
    if (idx < 0) throw new Error(`User item not found: ${item.key}`)
    file.userItems[idx] = item
    saveClaudeEnvDictFile(file)
    return readMerged()
  })

  ipcMain.handle('claude-env-dict:delete-user-item', (_e, key: string) => {
    const file = loadClaudeEnvDictFile()
    file.userItems = file.userItems.filter((u) => u.key !== key)
    saveClaudeEnvDictFile(file)
    return readMerged()
  })

  ipcMain.handle('claude-env-dict:set-built-in-override', (_e, key: string, override: BuiltInOverride) => {
    if (!builtInKeySet().has(key)) throw new Error(`Not a built-in key: ${key}`)
    const file = loadClaudeEnvDictFile()
    if (Object.keys(override).length === 0) {
      delete file.builtInOverrides[key]
    } else {
      file.builtInOverrides[key] = override
    }
    saveClaudeEnvDictFile(file)
    return readMerged()
  })
}
