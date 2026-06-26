import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { renameSync } from 'fs'
import { app } from 'electron'
import { loadSettings } from './config'
import { migrateShellConfig } from '@shared/shell-migration'
import type { ShellConfigData } from '@shared/shell-types'
import { createEmptyShellConfig, BUILTIN_FUNCTIONS } from '@shared/builtin-functions'
import { assertShellConfigData } from '@shared/ipc-contracts'
import { readMachineId } from './machine-id'
import { mergeLegacyLocalItems } from './legacy-migration'

const SHELL_DATA_FILENAME = 'rcland.config.shell.json'
const LOCAL_SHELL_FILENAME = 'rcland.config.shell.local.json'

function getShellDataPath(): string {
  const settings = loadSettings()
  return join(settings.configDir, SHELL_DATA_FILENAME)
}

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

/** 读旧 shell .local.json，返回五数组或 null */
function readLegacyShellLocal(): {
  variables: unknown[]
  pathVariables: unknown[]
  pathEntries: unknown[]
  functions: unknown[]
  aliases: unknown[]
} | null {
  const p = join(getLocalDir(), LOCAL_SHELL_FILENAME)
  if (!existsSync(p)) return null
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8'))
    return {
      variables: Array.isArray(parsed.variables) ? parsed.variables : [],
      pathVariables: Array.isArray(parsed.pathVariables) ? parsed.pathVariables : [],
      pathEntries: Array.isArray(parsed.pathEntries) ? parsed.pathEntries : [],
      functions: Array.isArray(parsed.functions) ? parsed.functions : [],
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases : []
    }
  } catch {
    return null
  }
}

function archiveLegacyShellLocal(): void {
  const p = join(getLocalDir(), LOCAL_SHELL_FILENAME)
  if (existsSync(p)) {
    try {
      renameSync(p, p + '.migrated')
    } catch {
      /* ignore */
    }
  }
}

/**
 * 加载统一配置文件，迁移旧 local shell 数据（含 PATH）到 applicableMachines
 */
export function loadShellConfig(): string {
  const p = getShellDataPath()
  let config: ShellConfigData
  if (!existsSync(p)) {
    config = createEmptyShellConfig()
  } else {
    config = migrateShellConfig(JSON.parse(readFileSync(p, 'utf-8')))
  }

  // 语义迁移：旧 shell .local.json 存在则合并（多机时序陷阱——独立检查）
  const legacy = readLegacyShellLocal()
  let migrated = false
  if (legacy) {
    const machineId = readMachineId()
    if (machineId) {
      config = {
        ...config,
        version: 2,
        variables: mergeLegacyLocalItems(
          config.variables,
          legacy.variables as never[],
          machineId
        ) as typeof config.variables,
        // PATH 两类：旧本机数据全部打 [machineId]
        pathVariables: mergeLegacyLocalItems(
          config.pathVariables,
          legacy.pathVariables as never[],
          machineId
        ) as typeof config.pathVariables,
        pathEntries: mergeLegacyLocalItems(
          config.pathEntries,
          legacy.pathEntries as never[],
          machineId
        ) as typeof config.pathEntries,
        functions: mergeLegacyLocalItems(
          config.functions.filter((f) => !f.builtIn),
          legacy.functions as never[],
          machineId
        ) as typeof config.functions,
        aliases: mergeLegacyLocalItems(
          config.aliases,
          legacy.aliases as never[],
          machineId
        ) as typeof config.aliases
      }
      migrated = true
    }
  }

  // 合并内置函数（保留用户 enabled 状态）
  const userFunctions = config.functions.filter((f) => !f.builtIn)
  const builtInStatus = new Map(
    config.functions.filter((f) => f.builtIn).map((f) => [f.id, f.enabled])
  )
  const mergedBuiltIns = BUILTIN_FUNCTIONS.map((bi) => ({
    ...bi,
    enabled: builtInStatus.get(bi.id) ?? bi.enabled
  }))
  const finalConfig: ShellConfigData = {
    ...config,
    version: 2,
    functions: [...mergedBuiltIns, ...userFunctions]
  }

  if (migrated) {
    const dir = loadSettings().configDir
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(p, JSON.stringify(finalConfig, null, 2), 'utf-8')
    archiveLegacyShellLocal()
  }

  return JSON.stringify(finalConfig)
}

/**
 * 保存配置：写入统一同步文件，不再拆分
 */
export function saveShellConfig(json: string): void {
  const config: ShellConfigData = JSON.parse(json)
  const syncedConfig: ShellConfigData = { ...config, version: 2 }
  const dir = loadSettings().configDir
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const p = getShellDataPath()
  const out = JSON.stringify(syncedConfig, null, 2)
  const existing = existsSync(p) ? readFileSync(p, 'utf-8') : ''
  if (existing !== out) writeFileSync(p, out, 'utf-8')
}

export function loadShellConfigData(): ShellConfigData {
  const data = JSON.parse(loadShellConfig())
  assertShellConfigData(data)
  return data
}

export function saveShellConfigData(data: ShellConfigData): void {
  assertShellConfigData(data)
  saveShellConfig(JSON.stringify(data))
}
