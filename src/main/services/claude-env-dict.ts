import { join } from 'path'
import type { ClaudeEnvDictFile } from '@shared/types/claude-env-dict'
import { loadClaudeEnvDictFileFrom, saveClaudeEnvDictFileTo } from './claude-env-dict-loader'
import { loadSettings } from './config'

const FILENAME = 'rcland.config.claude-env-dict.json'

function getDictFilePath(): string {
  return join(loadSettings().configDir, FILENAME)
}

export function loadClaudeEnvDictFile(): ClaudeEnvDictFile {
  return loadClaudeEnvDictFileFrom(getDictFilePath())
}

export function saveClaudeEnvDictFile(data: ClaudeEnvDictFile): void {
  saveClaudeEnvDictFileTo(getDictFilePath(), data)
}

export { loadClaudeEnvDictFileFrom, saveClaudeEnvDictFileTo }
