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

  // 3. 为本机项标记 localOnly: true
  // 4. 合并（同步在前、本机在后，各组内按 order 排序）
  const sortByOrder = <T extends { order: number }>(items: T[]): T[] =>
    items.sort((a, b) => a.order - b.order)

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
    variables: [...sortByOrder(syncedConfig.variables), ...sortByOrder(markLocalItems(localConfig.variables))],
    pathVariables: [...sortByOrder(syncedConfig.pathVariables), ...sortByOrder(localConfig.pathVariables)].map((v) => ({ ...v, localOnly: true })),
    pathEntries: [...sortByOrder(syncedConfig.pathEntries), ...sortByOrder(localConfig.pathEntries)].map((e) => ({ ...e, localOnly: true })),
    functions: [...mergedBuiltIns, ...sortByOrder(userFunctions)],
    aliases: [...sortByOrder(syncedConfig.aliases), ...sortByOrder(markLocalItems(localConfig.aliases))]
  }

  return JSON.stringify(merged)
}

/**
 * 保存配置：按 localOnly 拆分，分别写入同步文件和本机文件
 */
export function saveShellConfig(json: string): void {
  const config: ShellConfigData = JSON.parse(json)

  // 拆分五个数组
  const vars = splitLocalItems(config.variables)
  const pathVars = splitLocalItems(config.pathVariables)
  const paths = splitLocalItems(config.pathEntries)
  const funcs = splitLocalItems(config.functions)
  const aliases = splitLocalItems(config.aliases)

  // 写入同步文件
  const syncedConfig: ShellConfigData = {
    ...config,
    variables: vars.synced,
    pathVariables: pathVars.synced,
    pathEntries: paths.synced,
    functions: funcs.synced,
    aliases: aliases.synced
  }
  const settings = loadSettings()
  const dir = settings.configDir
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getShellDataPath(), JSON.stringify(syncedConfig, null, 2), 'utf-8')

  // 写入本机文件
  const localConfig: LocalShellConfigData = {
    version: 1,
    variables: vars.local,
    pathVariables: pathVars.local,
    pathEntries: paths.local,
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
