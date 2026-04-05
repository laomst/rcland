import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { app } from 'electron'
import type { LocalCCLaunchData } from '@shared/types'
import { createEmptyLocalCCLaunchData } from '@shared/types'

const LOCAL_CC_DATA_FILENAME = 'rcland.config.claudecode.local.json'

function getLocalCCDataPath(): string {
  return join(app.getPath('userData'), LOCAL_CC_DATA_FILENAME)
}

export function loadLocalCCConfig(): LocalCCLaunchData {
  const p = getLocalCCDataPath()
  if (!existsSync(p)) {
    return createEmptyLocalCCLaunchData()
  }
  const raw = readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

export function saveLocalCCConfig(data: LocalCCLaunchData): void {
  writeFileSync(getLocalCCDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
