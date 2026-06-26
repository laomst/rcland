// 一次性迁移工具：旧 localOnly 物理拆分模型 -> applicableMachines 白名单模型。
// 自包含，不依赖将被删除的 Local*Data 类型与 local-* 模块。

/** 剥除残留的 localOnly 字段 */
export function stripLegacyLocalOnly<T>(item: T): T {
  if (item && typeof item === 'object') {
    const { localOnly: _localOnly, ...rest } = item as Record<string, unknown>
    return rest as T
  }
  return item
}

/**
 * 合并旧 local 项到 synced 数组：
 * - synced 项原样保留（applicableMachines 留空 = 全适用）
 * - local 项剥 localOnly、打 applicableMachines=[machineId]，追加在后
 * 纯函数，不改入参。
 */
export function mergeLegacyLocalItems<T>(syncedItems: T[], localItems: T[], machineId: string): T[] {
  const syncedClean = syncedItems.map((it) => stripLegacyLocalOnly(it))
  const localTagged = localItems.map((it) => ({
    ...stripLegacyLocalOnly(it),
    applicableMachines: [machineId]
  })) as T[]
  return [...syncedClean, ...localTagged]
}
