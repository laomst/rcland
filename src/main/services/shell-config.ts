import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { loadSettings } from './config'
import { loadLocalShellConfig, saveLocalShellConfig } from './local-shell-config'
import { migrateShellConfig } from '@shared/shell-migration'
import type { ShellConfigData, LocalShellConfigData } from '@shared/shell-types'
import { createEmptyShellConfig, BUILTIN_FUNCTIONS } from '@shared/builtin-functions'

const SHELL_DATA_FILENAME = 'rcland.config.shell.json'

function getShellDataPath(): string {
  const settings = loadSettings()
  return join(settings.configDir, SHELL_DATA_FILENAME)
}

/** 按 localOnly 拆分配置项数组 */
function splitByLocal<T extends { localOnly?: boolean }>(items: T[]): { synced: T[]; local: T[] } {
  const synced: T[] = []
  const local: T[] = []
  for (const item of items) {
    if (item.localOnly) {
      local.push(item)
    } else {
      // 同步项不写入 localOnly 字段，保持向后兼容
      const { localOnly, ...rest } = item as any
      synced.push(rest as T)
    }
  }
  return { synced, local }
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
  const markLocal = <T extends { localOnly?: boolean }>(items: T[]): T[] =>
    items.map((item) => ({ ...item, localOnly: true }))

  // 4. 合并（同步在前、本机在后，各组内按 order 排序）
  const sortByOrder = <T extends { order: number }>(items: T[]): T[] =>
    items.sort((a, b) => a.order - b.order)

  // 5. 合并内置函数：保留用户的 enabled 状态，其余用内置定义覆盖
  const userFunctions = [...syncedConfig.functions, ...markLocal(localConfig.functions)].filter(
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
    variables: [...sortByOrder(syncedConfig.variables), ...sortByOrder(markLocal(localConfig.variables))],
    pathEntries: [...sortByOrder(syncedConfig.pathEntries), ...sortByOrder(markLocal(localConfig.pathEntries))],
    functions: [...mergedBuiltIns, ...sortByOrder(userFunctions)],
    aliases: [...sortByOrder(syncedConfig.aliases), ...sortByOrder(markLocal(localConfig.aliases))]
  }

  return JSON.stringify(merged)
}

/**
 * 保存配置：按 localOnly 拆分，分别写入同步文件和本机文件
 */
export function saveShellConfig(json: string): void {
  const config: ShellConfigData = JSON.parse(json)

  // 拆分四个数组
  const vars = splitByLocal(config.variables)
  const paths = splitByLocal(config.pathEntries)
  const funcs = splitByLocal(config.functions)
  const aliases = splitByLocal(config.aliases)

  // 写入同步文件
  const syncedConfig: ShellConfigData = {
    ...config,
    variables: vars.synced,
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
    pathEntries: paths.local,
    functions: funcs.local,
    aliases: aliases.local
  }
  saveLocalShellConfig(localConfig)
}
