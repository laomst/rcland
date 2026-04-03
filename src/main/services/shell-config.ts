import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { loadSettings } from './config'
import { migrateShellConfig } from '../../shared/shell-migration'
import type { ShellConfigData } from '../../shared/shell-types'
import { createEmptyShellConfig } from '../../shared/shell-types'

const SHELL_DATA_FILENAME = 'rcland.config.shell.json'

function getShellDataPath(): string {
  const settings = loadSettings()
  return join(settings.configDir, SHELL_DATA_FILENAME)
}

export function loadShellConfig(): string {
  const p = getShellDataPath()
  if (!existsSync(p)) {
    const empty = createEmptyShellConfig()
    return JSON.stringify(empty)
  }

  const raw = readFileSync(p, 'utf-8')
  const parsed = JSON.parse(raw)
  const migrated = migrateShellConfig(parsed)

  // If migration changed the data, persist it
  if (migrated.version !== parsed.version) {
    const migratedJson = JSON.stringify(migrated, null, 2)
    writeFileSync(p, migratedJson, 'utf-8')
    return migratedJson
  }

  return raw
}

export function saveShellConfig(json: string): void {
  const settings = loadSettings()
  const dir = settings.configDir
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getShellDataPath(), json, 'utf-8')
}
