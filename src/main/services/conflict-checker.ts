import type { ShellConfigData, ConflictCheckResult, ConflictWarning, ConflictError } from '@shared/shell-types'

/** Common system commands that should warn when aliased */
const SYSTEM_COMMANDS = new Set([
  'ls', 'cd', 'rm', 'mv', 'cp', 'mkdir', 'rmdir', 'cat', 'echo',
  'grep', 'find', 'sed', 'awk', 'chmod', 'chown', 'kill', 'ps',
  'pwd', 'man', 'which', 'sudo', 'su'
])

export function checkConflicts(config: ShellConfigData): ConflictCheckResult {
  const warnings: ConflictWarning[] = []
  const errors: ConflictError[] = []

  // 1. Duplicate variable keys
  const varKeys = new Map<string, string[]>()
  for (const v of config.variables.filter((v) => v.enabled)) {
    if (!varKeys.has(v.key)) varKeys.set(v.key, [])
    varKeys.get(v.key)!.push(v.id)
  }
  for (const [key, ids] of varKeys) {
    if (ids.length > 1) {
      errors.push({ type: 'duplicate-var-key', message: `环境变量 "${key}" 重复定义`, itemIds: ids })
    }
  }

  // 2. Duplicate aliases
  const aliasNames = new Map<string, string[]>()
  for (const a of config.aliases.filter((a) => a.enabled)) {
    if (!aliasNames.has(a.alias)) aliasNames.set(a.alias, [])
    aliasNames.get(a.alias)!.push(a.id)
  }
  for (const [name, ids] of aliasNames) {
    if (ids.length > 1) {
      errors.push({ type: 'duplicate-alias', message: `别名 "${name}" 重复定义`, itemIds: ids })
    }
  }

  // 3. Alias-function name conflict
  const funcNames = new Set(config.functions.filter((f) => f.enabled).map((f) => f.name))
  for (const a of config.aliases.filter((a) => a.enabled)) {
    if (funcNames.has(a.alias)) {
      const fn = config.functions.find((f) => f.name === a.alias)
      errors.push({
        type: 'alias-func-conflict',
        message: `别名 "${a.alias}" 与函数 "${a.alias}" 名称冲突`,
        itemIds: [a.id, fn?.id ?? '']
      })
    }
  }

  // 4. Alias shadows system command (warning)
  for (const a of config.aliases.filter((a) => a.enabled)) {
    if (SYSTEM_COMMANDS.has(a.alias)) {
      warnings.push({
        type: 'alias-shadows-command',
        message: `别名 "${a.alias}" 会覆盖系统命令`,
        itemIds: [a.id]
      })
    }
  }

  // 5. Duplicate PATH entries (warning)
  const pathValues = new Map<string, string[]>()
  for (const p of config.pathEntries.filter((p) => p.enabled)) {
    if (!pathValues.has(p.path)) pathValues.set(p.path, [])
    pathValues.get(p.path)!.push(p.id)
  }
  for (const [path, ids] of pathValues) {
    if (ids.length > 1) {
      warnings.push({ type: 'duplicate-path', message: `PATH 条目 "${path}" 重复`, itemIds: ids })
    }
  }

  // 6. Unused variable reference in PATH (warning)
  const definedVars = new Set(config.variables.filter((v) => v.enabled).map((v) => v.key))
  for (const p of config.pathEntries.filter((p) => p.enabled)) {
    const refs = p.path.match(/\$([A-Z_][A-Z0-9_]*)/g)
    if (refs) {
      for (const ref of refs) {
        const varName = ref.slice(1) // remove $
        if (varName !== 'HOME' && varName !== 'PATH' && !definedVars.has(varName)) {
          warnings.push({
            type: 'unused-variable-ref',
            message: `PATH 条目引用了未定义的变量 $${varName}`,
            itemIds: [p.id]
          })
        }
      }
    }
  }

  return { warnings, errors }
}
