import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings, CCLaunchData, Provider, ConfigSet, LocalCCLaunchData } from '@shared/types'
import type { ShellType } from '@shared/shell'
import { platform } from 'os'
import { loadLocalCCConfig, saveLocalCCConfig } from './local-cc-config'

const SETTINGS_FILENAME = 'settings.json'
const DATA_FILENAME = 'rcland.config.claudecode.json'

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
  const localProviders = localData.providers.map(p => ({ ...p, localOnly: true }))
  const localConfigs = localData.configs.map(c => ({ ...c, localOnly: true }))

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

/** Split items by localOnly flag, stripping localOnly from synced items */
function splitByLocal<T extends { localOnly?: boolean }>(items: T[]): { synced: Omit<T, 'localOnly'>[]; local: T[] } {
  const synced: Omit<T, 'localOnly'>[] = []
  const local: T[] = []
  for (const item of items) {
    if (item.localOnly) {
      local.push(item)
    } else {
      const { localOnly: _, ...rest } = item as T & { localOnly?: boolean }
      synced.push(rest as Omit<T, 'localOnly'>)
    }
  }
  return { synced, local }
}

export function saveData(json: string): void {
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)

  const data: CCLaunchData = JSON.parse(json)

  // Split providers
  const { synced: syncedProviders, local: localProviders } = splitByLocal(data.providers)

  // Split configs
  const { synced: syncedConfigs, local: localConfigs } = splitByLocal(data.configs)

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
