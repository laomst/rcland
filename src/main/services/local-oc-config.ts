import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { app } from 'electron'
import type { LocalOCLandData } from '@shared/types'
import { createEmptyLocalOCLandData } from '@shared/types'

const LOCAL_OC_DATA_FILENAME = 'rcland.config.opencode.local.json'

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

function getLocalOCDataPath(): string {
  return join(getLocalDir(), LOCAL_OC_DATA_FILENAME)
}

export function loadLocalOCConfig(): LocalOCLandData {
  const p = getLocalOCDataPath()
  if (!existsSync(p)) {
    return createEmptyLocalOCLandData()
  }
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.providers) || !Array.isArray(parsed.launchItems)) {
      return createEmptyLocalOCLandData()
    }
    return parsed as LocalOCLandData
  } catch {
    return createEmptyLocalOCLandData()
  }
}

export function saveLocalOCConfig(data: LocalOCLandData): void {
  mkdirSync(getLocalDir(), { recursive: true })
  writeFileSync(getLocalOCDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
