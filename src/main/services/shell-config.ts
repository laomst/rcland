import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { loadSettings } from './config'
import { loadLocalShellConfig, saveLocalShellConfig } from './local-shell-config'
import { migrateShellConfig } from '@shared/shell-migration'
import type { ShellConfigData, LocalShellConfigData } from '@shared/shell-types'
import { createEmptyShellConfig, BUILTIN_FUNCTIONS } from '@shared/builtin-functions'
import { assertShellConfigData } from '@shared/ipc-contracts'
import { markLocalItems, splitLocalItems } from './local-sync'

const SHELL_DATA_FILENAME = 'rcland.config.shell.json'

function getShellDataPath(): string {
  const settings = loadSettings()
  return join(settings.configDir, SHELL_DATA_FILENAME)
}

/**
 * 加载同步 + 本机配置并合并返回
 * 本机项会被标记 localOnly: true
 */
export function loadShellConfig(): string {
  // 1. 加载同步配置
  let syncedConfig: ShellConfigData
  const p = getShellDataPath()
  if (!existsSync(p)) {
    syncedConfig = createEmptyShellConfig()
  } else {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    syncedConfig = migrateShellConfig(parsed)

    // 迁移后回写
    if (syncedConfig.version !== parsed.version) {
      writeFileSync(p, JSON.stringify(syncedConfig, null, 2), 'utf-8')
    }
  }

  // 2. 加载本机配置
  const localConfig = loadLocalShellConfig()

  // 2.5 迁移：synced 文件中残留的 pathEntries/pathVariables 合并到 local
  if (syncedConfig.pathEntries.length > 0 || syncedConfig.pathVariables.length > 0) {
    const existingIds = new Set([
      ...localConfig.pathEntries.map((e) => e.id),
      ...localConfig.pathVariables.map((v) => v.id)
    ])
    const newEntries = syncedConfig.pathEntries.filter((e) => !existingIds.has(e.id))
    const newVars = syncedConfig.pathVariables.filter((v) => !existingIds.has(v.id))
    if (newEntries.length > 0 || newVars.length > 0) {
      localConfig.pathEntries = [...localConfig.pathEntries, ...newEntries]
      localConfig.pathVariables = [...localConfig.pathVariables, ...newVars]
      saveLocalShellConfig(localConfig)
    }
    syncedConfig.pathEntries = []
    syncedConfig.pathVariables = []
    writeFileSync(p, JSON.stringify(syncedConfig, null, 2), 'utf-8')
  }

  // 3. 为本机项标记 localOnly: true
  // 4. 合并（同步在前、本机在后，保持 JSON 数组顺序）

  // 5. 合并内置函数：保留用户的 enabled 状态，其余用内置定义覆盖
  const userFunctions = [...syncedConfig.functions, ...markLocalItems(localConfig.functions)].filter(
    (f) => !f.builtIn
  )
  const localFunctionStatus = new Map(
    [...syncedConfig.functions, ...localConfig.functions]
      .filter((f) => f.builtIn)
      .map((f) => [f.id, f.enabled])
  )
  const mergedBuiltIns = BUILTIN_FUNCTIONS.map((bi) => ({
    ...bi,
    enabled: localFunctionStatus.get(bi.id) ?? bi.enabled
  }))

  const merged: ShellConfigData = {
    ...syncedConfig,
    variables: [...syncedConfig.variables, ...markLocalItems(localConfig.variables)],
    pathVariables: localConfig.pathVariables,
    pathEntries: localConfig.pathEntries,
    functions: [...mergedBuiltIns, ...userFunctions],
    aliases: [...syncedConfig.aliases, ...markLocalItems(localConfig.aliases)]
  }

  return JSON.stringify(merged)
}

/**
 * 保存配置：按 localOnly 拆分，分别写入同步文件和本机文件
 */
export function saveShellConfig(json: string): void {
  const config: ShellConfigData = JSON.parse(json)

  // 拆分三个可同步数组
  const vars = splitLocalItems(config.variables)
  const funcs = splitLocalItems(config.functions)
  const aliases = splitLocalItems(config.aliases)

  // 写入同步文件（pathVariables 和 pathEntries 不参与同步）
  const syncedConfig: ShellConfigData = {
    ...config,
    variables: vars.synced,
    pathVariables: [],
    pathEntries: [],
    functions: funcs.synced,
    aliases: aliases.synced
  }
  const settings = loadSettings()
  const dir = settings.configDir
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const syncedPath = getShellDataPath()
  const syncedJson = JSON.stringify(syncedConfig, null, 2)
  const existingSynced = existsSync(syncedPath) ? readFileSync(syncedPath, 'utf-8') : ''
  if (existingSynced !== syncedJson) {
    writeFileSync(syncedPath, syncedJson, 'utf-8')
  }

  // 写入本机文件（pathVariables 和 pathEntries 全部存 local）
  const localConfig: LocalShellConfigData = {
    version: 1,
    variables: vars.local,
    pathVariables: config.pathVariables,
    pathEntries: config.pathEntries,
    functions: funcs.local,
    aliases: aliases.local
  }
  saveLocalShellConfig(localConfig)
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
