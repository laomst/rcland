import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import type { AppSettings, CCLaunchData, CXLandData, Provider, LaunchItem, CXProvider, CXLaunchItem, LocalCXLandData, OCLandData, OCProvider, OCLaunchItem, LocalOCLandData, McpServersData } from '@shared/types'
import { createEmptyCXLandData, normalizeCXLandData, createEmptyOCLandData, normalizeOCLandData, normalizeMcpServersData } from '@shared/types'
import type { ShellType } from '@shared/shell'
import { assertAppSettings, assertCCLaunchData, assertCXLandData, assertOCLandData } from '@shared/ipc-contracts'
import { platform } from 'os'
import { loadLocalCXConfig, saveLocalCXConfig } from './local-cx-config'
import { loadLocalOCConfig, saveLocalOCConfig } from './local-oc-config'
import { markLocalItems, splitLocalItems } from './local-sync'
import { readMachineId } from './machine-id'
import { mergeLegacyLocalItems } from './legacy-migration'

const SETTINGS_FILENAME = 'settings.json'
const DATA_FILENAME = 'rcland.config.claudecode.json'
const CX_DATA_FILENAME = 'rcland.config.codex.json'
const OC_DATA_FILENAME = 'rcland.config.opencode.json'
const MCP_DATA_FILENAME = 'rcland.mcp-servers.json'

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

/** 读旧 .local.json（自包含，不依赖被删模块）。返回 { providers, launchItems } 或 null */
function readLegacyLocal(filename: string): { providers: unknown[]; launchItems: unknown[] } | null {
  const p = join(getLocalDir(), filename)
  if (!existsSync(p)) return null
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8'))
    return {
      providers: Array.isArray(parsed.providers) ? parsed.providers : [],
      launchItems: Array.isArray(parsed.launchItems) ? parsed.launchItems : []
    }
  } catch {
    return null
  }
}

/** 归档旧 local 文件：重命名为 .migrated，避免二次迁移 */
function archiveLegacyLocal(filename: string): void {
  const p = join(getLocalDir(), filename)
  if (existsSync(p)) {
    try { renameSync(p, p + '.migrated') } catch { /* ignore */ }
  }
}

function getSettingsPath(): string {
  return join(getLocalDir(), SETTINGS_FILENAME)
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
  const dir = getLocalDir()
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

const LOCAL_CC_FILENAME = 'rcland.config.claudecode.local.json'

export function loadData(): string | null {
  const settings = loadSettings()
  const p = join(settings.configDir, DATA_FILENAME)

  // 读主文件（接受 5/6/7，旧版本升到 7）
  let syncedData: CCLaunchData | null = null
  if (existsSync(p)) {
    const parsed = JSON.parse(readFileSync(p, 'utf-8'))
    if (parsed.version === 5 || parsed.version === 6 || parsed.version === 7) {
      parsed.version = 7
      syncedData = parsed
    }
  }

  // 语义迁移：独立检查旧 .local.json（多机时序陷阱——不看主文件版本号）
  const legacy = readLegacyLocal(LOCAL_CC_FILENAME)
  let migrated = false
  if (legacy) {
    const machineId = readMachineId()
    if (machineId) {
      const base = syncedData ?? { version: 7 as const, providers: [], launchItems: [], selector: { funcName: 'cc', promptTitle: '选择启动器' } }
      syncedData = {
        version: 7,
        providers: mergeLegacyLocalItems(base.providers, legacy.providers as never[], machineId) as Provider[],
        launchItems: mergeLegacyLocalItems(base.launchItems, legacy.launchItems as never[], machineId) as LaunchItem[],
        selector: base.selector
      }
      migrated = true
    }
  }

  // selector 清洗（沿用旧逻辑）
  const rawSelector = syncedData?.selector ?? { funcName: 'cc', promptTitle: '选择启动器' }
  const { aliasName: _, enabled: __, ...cleanSelector } = rawSelector as unknown as Record<string, unknown>
  const selector = { funcName: (cleanSelector.funcName as string) || 'cc', promptTitle: (cleanSelector.promptTitle as string) || '选择启动器', ...cleanSelector }

  const merged: CCLaunchData = {
    version: 7,
    providers: syncedData?.providers ?? [],
    launchItems: syncedData?.launchItems ?? [],
    selector
  }

  // 迁移后立即写回主文件并归档 local
  if (migrated) {
    ensureConfigDir(settings.configDir)
    writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
    archiveLegacyLocal(LOCAL_CC_FILENAME)
  }

  if (merged.providers.length === 0 && merged.launchItems.length === 0 && !syncedData) {
    return null
  }
  return JSON.stringify(merged)
}

export function saveData(json: string): void {
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)
  const data: CCLaunchData = JSON.parse(json)
  const syncedData: CCLaunchData = {
    version: 7,
    providers: data.providers,
    launchItems: data.launchItems,
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')
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
      if (normalized.version === 4) syncedData = normalized
    } catch {
      // Discard malformed file
    }
  }

  const localData = loadLocalCXConfig()
  const localProviders = markLocalItems(localData.providers)
  const localLaunchItems = markLocalItems(localData.launchItems)

  // Backward compatibility: accept both 'configs' (old) and 'launchItems' (new) from disk
  const syncedLaunchItems = syncedData?.launchItems ?? []

  const empty = createEmptyCXLandData()
  const rawCXSelector = syncedData?.selector ?? empty.selector
  // Clean up legacy fields
  const { aliasName: _, enabled: __, ...cleanCXSelector } = rawCXSelector as unknown as Record<string, unknown>
  const cxSelector = { funcName: (cleanCXSelector.funcName as string) || 'cx', promptTitle: (cleanCXSelector.promptTitle as string) || '选择 Codex 供应商', ...cleanCXSelector }

  const merged: CXLandData = {
    version: 4,
    providers: [...(syncedData?.providers ?? []), ...localProviders],
    launchItems: [...syncedLaunchItems, ...localLaunchItems],
    selector: cxSelector
  }

  assertCXLandData(merged)
  return merged
}

export function saveCXLandData(data: CXLandData): void {
  assertCXLandData(data)
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)

  const { synced: syncedProviders, local: localProviders } = splitLocalItems(data.providers)
  const { synced: syncedLaunchItems, local: localLaunchItems } = splitLocalItems(data.launchItems)

  const syncedData: CXLandData = {
    version: 4,
    providers: syncedProviders as CXProvider[],
    launchItems: syncedLaunchItems as CXLaunchItem[],
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, CX_DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')

  const localData: LocalCXLandData = {
    version: 1,
    providers: localProviders.map(p => { const { localOnly: _, ...rest } = p; return rest }) as CXProvider[],
    launchItems: localLaunchItems.map(c => { const { localOnly: _, ...rest } = c; return rest }) as CXLaunchItem[]
  }
  saveLocalCXConfig(localData)
}

// ============================================================
// OCLand Data (v1, syncable + local split)
// ============================================================

export function loadOCLandData(): OCLandData {
  const settings = loadSettings()
  const p = join(settings.configDir, OC_DATA_FILENAME)

  let syncedData: OCLandData | null = null
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf-8'))
      const normalized = normalizeOCLandData(parsed)
      if (normalized.version === 2) syncedData = normalized
    } catch {
      // Discard malformed file
    }
  }

  const localData = loadLocalOCConfig()
  const localProviders = markLocalItems(localData.providers)
  const localLaunchItems = markLocalItems(localData.launchItems)

  const empty = createEmptyOCLandData()
  const merged: OCLandData = {
    version: 2,
    providers: [...(syncedData?.providers ?? []), ...localProviders],
    launchItems: [...(syncedData?.launchItems ?? []), ...localLaunchItems],
    selector: syncedData?.selector ?? empty.selector
  }

  assertOCLandData(merged)
  return merged
}

export function saveOCLandData(data: OCLandData): void {
  assertOCLandData(data)
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)

  const { synced: syncedProviders, local: localProviders } = splitLocalItems(data.providers)
  const { synced: syncedLaunchItems, local: localLaunchItems } = splitLocalItems(data.launchItems)

  const syncedData: OCLandData = {
    version: 2,
    providers: syncedProviders as OCProvider[],
    launchItems: syncedLaunchItems as OCLaunchItem[],
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, OC_DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')

  const localData: LocalOCLandData = {
    version: 1,
    providers: localProviders.map(p => { const { localOnly: _, ...rest } = p; return rest }) as OCProvider[],
    launchItems: localLaunchItems.map(c => { const { localOnly: _, ...rest } = c; return rest }) as OCLaunchItem[]
  }
  saveLocalOCConfig(localData)
}

// ============================================================
// MCP Servers Data (v1, syncable, no local/synced split)
// ============================================================

export function loadMcpServersData(): McpServersData {
  const settings = loadSettings()
  const p = join(settings.configDir, MCP_DATA_FILENAME)
  if (!existsSync(p)) return { version: 1, servers: [] }
  try {
    return normalizeMcpServersData(JSON.parse(readFileSync(p, 'utf-8')))
  } catch {
    return { version: 1, servers: [] }
  }
}

export function saveMcpServersData(data: McpServersData): void {
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)
  writeFileSync(join(settings.configDir, MCP_DATA_FILENAME), JSON.stringify(data, null, 2), 'utf-8')
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
