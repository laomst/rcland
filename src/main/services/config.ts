import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import type { AppSettings, CCLaunchData, CXLandData, Provider, LaunchItem, CXProvider, CXLaunchItem, OCLandData, OCProvider, OCLaunchItem, McpServersData } from '@shared/types'
import { createEmptyCXLandData, normalizeCXLandData, createEmptyOCLandData, normalizeOCLandData, normalizeMcpServersData } from '@shared/types'
import type { ShellType } from '@shared/shell'
import { assertAppSettings, assertCCLaunchData, assertCXLandData, assertOCLandData } from '@shared/ipc-contracts'
import { platform } from 'os'
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
// CXLand Data (v5, syncable, unified)
// ============================================================

const LOCAL_CX_FILENAME = 'rcland.config.codex.local.json'

export function loadCXLandData(): CXLandData {
  const settings = loadSettings()
  const p = join(settings.configDir, CX_DATA_FILENAME)

  let syncedData: CXLandData | null = null
  if (existsSync(p)) {
    try {
      const normalized = normalizeCXLandData(JSON.parse(readFileSync(p, 'utf-8')))
      if (normalized.version === 5) syncedData = normalized
    } catch { /* discard */ }
  }

  const legacy = readLegacyLocal(LOCAL_CX_FILENAME)
  let migrated = false
  if (legacy) {
    const machineId = readMachineId()
    if (machineId) {
      const empty = createEmptyCXLandData()
      const base = syncedData ?? empty
      syncedData = {
        version: 5,
        providers: mergeLegacyLocalItems(base.providers, legacy.providers as never[], machineId) as CXProvider[],
        launchItems: mergeLegacyLocalItems(base.launchItems, legacy.launchItems as never[], machineId) as CXLaunchItem[],
        selector: base.selector
      }
      migrated = true
    }
  }

  const empty = createEmptyCXLandData()
  const rawCXSelector = syncedData?.selector ?? empty.selector
  const { aliasName: _, enabled: __, ...cleanCXSelector } = rawCXSelector as unknown as Record<string, unknown>
  const cxSelector = { funcName: (cleanCXSelector.funcName as string) || 'cx', promptTitle: (cleanCXSelector.promptTitle as string) || '选择 Codex 供应商', ...cleanCXSelector }

  const merged: CXLandData = {
    version: 5,
    providers: syncedData?.providers ?? [],
    launchItems: syncedData?.launchItems ?? [],
    selector: cxSelector
  }

  if (migrated) {
    ensureConfigDir(settings.configDir)
    writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
    archiveLegacyLocal(LOCAL_CX_FILENAME)
  }

  assertCXLandData(merged)
  return merged
}

export function saveCXLandData(data: CXLandData): void {
  assertCXLandData(data)
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)
  const syncedData: CXLandData = {
    version: 5,
    providers: data.providers,
    launchItems: data.launchItems,
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, CX_DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')
}

// ============================================================
// OCLand Data (v3, syncable, unified)
// ============================================================

const LOCAL_OC_FILENAME = 'rcland.config.opencode.local.json'

export function loadOCLandData(): OCLandData {
  const settings = loadSettings()
  const p = join(settings.configDir, OC_DATA_FILENAME)

  let syncedData: OCLandData | null = null
  if (existsSync(p)) {
    try {
      const normalized = normalizeOCLandData(JSON.parse(readFileSync(p, 'utf-8')))
      if (normalized.version === 3) syncedData = normalized
    } catch { /* discard */ }
  }

  const legacy = readLegacyLocal(LOCAL_OC_FILENAME)
  let migrated = false
  const empty = createEmptyOCLandData()
  if (legacy) {
    const machineId = readMachineId()
    if (machineId) {
      const base = syncedData ?? empty
      syncedData = {
        version: 3,
        providers: mergeLegacyLocalItems(base.providers, legacy.providers as never[], machineId) as OCProvider[],
        launchItems: mergeLegacyLocalItems(base.launchItems, legacy.launchItems as never[], machineId) as OCLaunchItem[],
        selector: base.selector
      }
      migrated = true
    }
  }

  const merged: OCLandData = {
    version: 3,
    providers: syncedData?.providers ?? [],
    launchItems: syncedData?.launchItems ?? [],
    selector: syncedData?.selector ?? empty.selector
  }

  if (migrated) {
    ensureConfigDir(settings.configDir)
    writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
    archiveLegacyLocal(LOCAL_OC_FILENAME)
  }

  assertOCLandData(merged)
  return merged
}

export function saveOCLandData(data: OCLandData): void {
  assertOCLandData(data)
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)
  const syncedData: OCLandData = {
    version: 3,
    providers: data.providers,
    launchItems: data.launchItems,
    selector: data.selector
  }
  writeFileSync(join(settings.configDir, OC_DATA_FILENAME), JSON.stringify(syncedData, null, 2), 'utf-8')
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
