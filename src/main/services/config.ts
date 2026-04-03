import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings, CCLaunchDataV2, CCLaunchDataV3, CCLaunchDataV4 } from '../../shared/types'
import { migrateV2ToV3, migrateV3ToV4, migrateV4ToV5 } from '../../shared/migration'
import { SHELL_DEFAULTS } from '../../shared/shell'
import { platform } from 'os'

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
  const defaultShell = osShells[platform()] ?? 'zsh'
  return {
    configDir: join(home, '.ccland'),
    keyFilePath: join(home, '.ccland', 'keyfile.key'),
    shellProfiles: {
      [defaultShell]: {
        enabled: true,
        profilePath: SHELL_DEFAULTS[defaultShell].profilePath,
        outputPath: join(home, `cctokenrc${SHELL_DEFAULTS[defaultShell].outputFileExt}`),
        autoSource: true
      }
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
  if (!existsSync(p)) return null

  const raw = readFileSync(p, 'utf-8')
  const parsed = JSON.parse(raw)

  // Auto-migrate v2 → v3 (which also migrates to v5)
  if (parsed.version === 2) {
    const migrated = migrateV2ToV3(parsed as CCLaunchDataV2)
    const migratedJson = JSON.stringify(migrated, null, 2)
    writeFileSync(p, migratedJson, 'utf-8')
    return migratedJson
  }

  // Auto-migrate v3 → v4 (which also migrates to v5)
  if (parsed.version === 3) {
    const migrated = migrateV3ToV4(parsed as CCLaunchDataV3)
    const migratedJson = JSON.stringify(migrated, null, 2)
    writeFileSync(p, migratedJson, 'utf-8')
    return migratedJson
  }

  // Auto-migrate v4 → v5
  if (parsed.version === 4) {
    const migrated = migrateV4ToV5(parsed as CCLaunchDataV4)
    const migratedJson = JSON.stringify(migrated, null, 2)
    writeFileSync(p, migratedJson, 'utf-8')
    return migratedJson
  }

  return raw
}

export function saveData(json: string): void {
  const settings = loadSettings()
  ensureConfigDir(settings.configDir)
  writeFileSync(join(settings.configDir, DATA_FILENAME), json, 'utf-8')
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
