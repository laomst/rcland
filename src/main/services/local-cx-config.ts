import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { app } from 'electron'
import type { LocalCXLandData } from '@shared/types'
import { createEmptyLocalCXLandData } from '@shared/types'

const LOCAL_CX_DATA_FILENAME = 'rcland.config.codex.local.json'

function getLocalCXDataPath(): string {
  return join(app.getPath('userData'), LOCAL_CX_DATA_FILENAME)
}

export function loadLocalCXConfig(): LocalCXLandData {
  const p = getLocalCXDataPath()
  if (!existsSync(p)) {
    return createEmptyLocalCXLandData()
  }
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.providers) || !Array.isArray(parsed.configs)) {
      return createEmptyLocalCXLandData()
    }
    return parsed as LocalCXLandData
  } catch {
    return createEmptyLocalCXLandData()
  }
}

export function saveLocalCXConfig(data: LocalCXLandData): void {
  writeFileSync(getLocalCXDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
