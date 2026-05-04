import { join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { app } from 'electron'
import type { LocalCCLaunchData } from '@shared/types'
import { loadLocalCCConfigFrom } from './local-cc-config-loader'

export { loadLocalCCConfigFrom } from './local-cc-config-loader'

const LOCAL_CC_DATA_FILENAME = 'rcland.config.claudecode.local.json'

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

function getLocalCCDataPath(): string {
  return join(getLocalDir(), LOCAL_CC_DATA_FILENAME)
}

export function loadLocalCCConfig(): LocalCCLaunchData {
  return loadLocalCCConfigFrom(getLocalCCDataPath())
}

export function saveLocalCCConfig(data: LocalCCLaunchData): void {
  mkdirSync(getLocalDir(), { recursive: true })
  writeFileSync(getLocalCCDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
