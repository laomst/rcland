import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings, CCLaunchData, CXLandData, Provider, ConfigSet, LocalCCLaunchData, CXProvider, CXConfigSet, LocalCXLandData } from '@shared/types'
import { createEmptyCXLandData, normalizeCXLandData } from '@shared/types'
import type { ShellType } from '@shared/shell'
import { assertAppSettings, assertCCLaunchData, assertCXLandData } from '@shared/ipc-contracts'
import { platform } from 'os'
import { loadLocalCCConfig, saveLocalCCConfig } from './local-cc-config'
import { loadLocalCXConfig, saveLocalCXConfig } from './local-cx-config'
import { markLocalItems, splitLocalItems } from './local-sync'

const SETTINGS_FILENAME = 'settings.json'
const DATA_FILENAME = 'rcland.config.claudecode.json'
const CX_DATA_FILENAME = 'rcland.config.codex.json'

function getUserDataDir(): string {
  return app.getPath('userData')
}

function getSettingsPath(): string {
  return join(getUserDataDir(), SETTINGS_FILENAME)
}

// ============================================================
// Settings (per-device)
// ============================================================

function getDefaultSettings(): AppSettings {
  const home = app.getPath('home')
  const osShells: Record<string, string> = {
    darwin: 'zsh',
    win32: 'powershell',
    linux: 'bash'
  }
  const defaultShell = (osShells[platform()] ?? 'zsh') as ShellType
  return {
    configDir: join(home, '.rcland'),
    keyFilePath: join(home, '.rcland', 'keyfile.key'),
    shellProfiles: {
      [defaultShell]: { enabled: true }
    }
  }
}

export function loadSettings(): AppSettings {
  const p = getSettingsPath()
  if (!existsSync(p)) {
    const defaults = getDefaultSettings()
    saveSettings(defaults)
    return defaults
  }
  return JSON.parse(readFileSync(p, 'utf-8'))
}

export function saveSettings(settings: AppSettings): void {
  assertAppSettings(settings)
  const dir = getUserDataDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

// ============================================================
// Data (syncable, in configDir)
// ============================================================

function ensureConfigDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function getConfigDir(): string {
  return loadSettings().configDir
}

export function setConfigDir(dir: string): void {
  const settings = loadSettings()
  settings.configDir = dir
  saveSettings(settings)
}

export function loadData(): string | null {
  const settings = loadSettings()
  const p = join(settings.configDir, DATA_FILENAME)

  // Load synced data
  let syncedData: CCLaunchData | null = null
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)

    if (parsed.version === 5) {
      syncedData = parsed
    }
  }

  // Load local data
  const localData = loadLocalCCConfig()

  // Merge: local items get localOnly=true
  const localProviders = markLocalItems(localData.providers)
  const localConfigs = markLocalItems(localData.configs)

  // Combine synced + local
  const merged: CCLaunchData = {
    version: 5,
    providers: [...(syncedData?.providers ?? []), ...localProviders],
    configs: [...(syncedData?.configs ?? []), ...localConfigs],
    selector: syncedData?.selector ?? { enabled: false, funcName: 'cc', promptTitle: '选择启动器' }
  }

  // Return null if no data at all
  if (merged.providers.length === 0 && merged.configs.length === 0 && !syncedData) {
    return null
  }

  return JSON.stringify(merged)
}

export function saveData(json: string): void {
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)

  const data: CCLaunchData = JSON.parse(json)

  // Split providers
  const { synced: syncedProviders, local: localProviders } = splitLocalItems(data.providers)

  // Split configs
  const { synced: syncedConfigs, local: localConfigs } = splitLocalItems(data.configs)

  // Save synced data (without localOnly field)
  const syncedData: CCLaunchData = {
    version: 5,
    providers: syncedProviders as Provider[],
    configs: syncedConfigs as ConfigSet[],
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')

  // Save local data (with localOnly field stripped, we'll re-add on load)
  const localData: LocalCCLaunchData = {
    version: 1,
    providers: localProviders.map(p => { const { localOnly: _, ...rest } = p; return rest }) as Provider[],
    configs: localConfigs.map(c => { const { localOnly: _, ...rest } = c; return rest }) as ConfigSet[]
  }
  saveLocalCCConfig(localData)
}

export function loadCCData(): CCLaunchData | null {
  const json = loadData()
  if (!json) return null
  const data = JSON.parse(json)
  assertCCLaunchData(data)
  return data
}

export function saveCCData(data: CCLaunchData): void {
  assertCCLaunchData(data)
  saveData(JSON.stringify(data))
}

// ============================================================
// CXLand Data (v3, syncable + local split)
// ============================================================

export function loadCXLandData(): CXLandData {
  const settings = loadSettings()
  const p = join(settings.configDir, CX_DATA_FILENAME)

  let syncedData: CXLandData | null = null
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'))
      const normalized = normalizeCXLandData(parsed)
      if (normalized.version === 3) syncedData = normalized
    } catch {
      // Discard malformed file
    }
  }

  const localData = loadLocalCXConfig()
  const localProviders = markLocalItems(localData.providers)
  const localConfigs = markLocalItems(localData.configs)

  const empty = createEmptyCXLandData()
  const merged: CXLandData = {
    version: 3,
    providers: [...(syncedData?.providers ?? []), ...localProviders],
    configs: [...(syncedData?.configs ?? []), ...localConfigs],
    selector: syncedData?.selector ?? empty.selector
  }

  assertCXLandData(merged)
  return merged
}

export function saveCXLandData(data: CXLandData): void {
  assertCXLandData(data)
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)

  const { synced: syncedProviders, local: localProviders } = splitLocalItems(data.providers)
  const { synced: syncedConfigs, local: localConfigs } = splitLocalItems(data.configs)

  const syncedData: CXLandData = {
    version: 3,
    providers: syncedProviders as CXProvider[],
    configs: syncedConfigs as CXConfigSet[],
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, CX_DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')

  const localData: LocalCXLandData = {
    version: 1,
    providers: localProviders.map(p => { const { localOnly: _, ...rest } = p; return rest }) as CXProvider[],
    configs: localConfigs.map(c => { const { localOnly: _, ...rest } = c; return rest }) as CXConfigSet[]
  }
  saveLocalCXConfig(localData)
}

// ============================================================
// File Dialogs
// ============================================================

export async function showOpenDialog(
  browserWindow: Electron.BrowserWindow | null,
  options: Electron.OpenDialogOptions
): Promise<string | null> {
  const result = await dialog.showOpenDialog(browserWindow!, options)
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export async function showSaveDialog(
  browserWindow: Electron.BrowserWindow | null,
  options: Electron.SaveDialogOptions
): Promise<string | null> {
  const result = await dialog.showSaveDialog(browserWindow!, options)
  if (result.canceled) return null
  return result.filePath ?? null
}
