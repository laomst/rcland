import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { app } from 'electron'
import type { LocalCXLandData } from '@shared/types'
import { createEmptyLocalCXLandData } from '@shared/types'

const LOCAL_CX_DATA_FILENAME = 'rcland.config.codex.local.json'

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

function getLocalCXDataPath(): string {
  return join(getLocalDir(), LOCAL_CX_DATA_FILENAME)
}

export function loadLocalCXConfig(): LocalCXLandData {
  const p = getLocalCXDataPath()
  if (!existsSync(p)) {
    return createEmptyLocalCXLandData()
  }
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.providers) || !Array.isArray(parsed.launchItems)) {
      return createEmptyLocalCXLandData()
    }
    return parsed as LocalCXLandData
  } catch {
    return createEmptyLocalCXLandData()
  }
}

export function saveLocalCXConfig(data: LocalCXLandData): void {
  mkdirSync(getLocalDir(), { recursive: true })
  writeFileSync(getLocalCXDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
