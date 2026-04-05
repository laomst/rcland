import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { app } from 'electron'
import type { LocalShellConfigData } from '@shared/shell-types'
import { createEmptyLocalShellConfig } from '@shared/builtin-functions'

const LOCAL_SHELL_DATA_FILENAME = 'rcland.config.shell.local.json'

function getLocalShellDataPath(): string {
  return join(app.getPath('userData'), LOCAL_SHELL_DATA_FILENAME)
}

export function loadLocalShellConfig(): LocalShellConfigData {
  const p = getLocalShellDataPath()
  if (!existsSync(p)) {
    return createEmptyLocalShellConfig()
  }
  const raw = readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

export function saveLocalShellConfig(data: LocalShellConfigData): void {
  writeFileSync(getLocalShellDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
