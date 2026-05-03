import type {
  ClaudeEnvDictItem,
  ClaudeEnvDictFile,
  UserClaudeEnvDictItem
} from './types/claude-env-dict'

/**
 * 合并内置预制与本地文件，得到运行时字典。
 *
 * 规则：
 * 1. 内置条目为基础
 * 2. `builtInOverrides[key]` 覆盖对应字段（目前仅 defaultInTemplate）
 * 3. `userItems` 拼到尾部；与内置 key 冲突 / 自身 key 重复时丢弃前面那条
 */
export function mergeClaudeEnvDict(
  builtIns: ClaudeEnvDictItem[],
  file: ClaudeEnvDictFile
): ClaudeEnvDictItem[] {
  const builtInKeys = new Set(builtIns.map((b) => b.key))

  const overriddenBuiltIns = builtIns.map((item) => {
    const override = file.builtInOverrides[item.key]
    if (!override) return item
    return {
      ...item,
      defaultInTemplate: override.defaultInTemplate ?? item.defaultInTemplate
    }
  })

  // 用户条目去重（last wins），并跳过与内置 key 冲突的
  const userByKey = new Map<string, UserClaudeEnvDictItem>()
  for (const u of file.userItems) {
    if (builtInKeys.has(u.key)) continue
    userByKey.set(u.key, u)
  }

  const userItems: ClaudeEnvDictItem[] = Array.from(userByKey.values()).map((u) => ({
    key: u.key,
    category: u.category,
    builtIn: false,
    defaultInTemplate: u.defaultInTemplate,
    exampleValue: u.exampleValue,
    description: { type: 'plain', text: u.description }
  }))

  return [...overriddenBuiltIns, ...userItems]
}
