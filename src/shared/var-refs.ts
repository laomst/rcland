import type { ShellType } from './shell'
import type { ShellVariable, PathEntry, PathVariable } from './shell-types'

const VAR_REF_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g

/** 从文本中提取所有 {{VAR}} 引用，返回去重后的变量名数组 */
export function extractVarRefs(text: string): string[] {
  const names = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(VAR_REF_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    names.add(match[1])
  }
  return [...names]
}

/** 检测变量间的循环引用，返回所有存在环路的变量 key 组 */
export function detectCircularRefs(variables: ShellVariable[]): string[][] {
  return detectCyclesGeneric(
    variables.filter((v) => v.enabled && v.key).map((v) => ({ key: v.key, value: v.value }))
  )
}

/** 检测路径变量间的循环引用 */
export function detectPathVarCircularRefs(pathVariables: PathVariable[]): string[][] {
  return detectCyclesGeneric(
    pathVariables.filter((v) => v.enabled && v.key).map((v) => ({ key: v.key, value: v.value }))
  )
}

function detectCyclesGeneric(items: { key: string; value: string }[]): string[][] {
  const adj = new Map<string, string[]>()
  for (const item of items) {
    adj.set(item.key, extractVarRefs(item.value))
  }
  const managed = new Set(adj.keys())
  for (const [key] of adj) {
    adj.set(key, adj.get(key)!.filter((r) => managed.has(r)))
  }

  const cycles: string[][] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(key: string, path: string[]): void {
    if (inStack.has(key)) {
      const cycleStart = path.indexOf(key)
      cycles.push(path.slice(cycleStart))
      return
    }
    if (visited.has(key)) return
    visited.add(key)
    inStack.add(key)
    const currentPath = [...path, key]
    for (const ref of adj.get(key) ?? []) {
      dfs(ref, currentPath)
    }
    inStack.delete(key)
  }

  for (const key of managed) {
    dfs(key, [])
  }
  return cycles
}

export interface RefEntry {
  type: 'variable' | 'path' | 'pathVariable'
  id: string
  keyOrPath: string
}

/** 找出所有引用了指定变量 key 的条目 */
export function findReferencingEntries(
  targetKey: string,
  variables: ShellVariable[],
  paths: PathEntry[],
  pathVariables?: PathVariable[]
): RefEntry[] {
  const results: RefEntry[] = []
  const pattern = `{{${targetKey}}}`

  for (const v of variables) {
    if (v.value.includes(pattern)) {
      results.push({ type: 'variable', id: v.id, keyOrPath: v.key })
    }
  }
  for (const p of paths) {
    if (p.path.includes(pattern)) {
      results.push({ type: 'path', id: p.id, keyOrPath: p.path })
    }
  }
  if (pathVariables) {
    for (const pv of pathVariables) {
      if (pv.value.includes(pattern)) {
        results.push({ type: 'pathVariable', id: pv.id, keyOrPath: pv.key })
      }
    }
  }
  return results
}

/** 拓扑排序路径变量，被引用的排在前面 */
export function topoSortPathVariables(pathVariables: PathVariable[]): PathVariable[] {
  const enabled = pathVariables.filter((v) => v.enabled && v.key)
  if (enabled.length <= 1) return pathVariables

  const keyToVar = new Map<string, PathVariable>()
  const deps = new Map<string, string[]>()

  for (const v of enabled) {
    keyToVar.set(v.key, v)
  }
  const enabledKeys = new Set(keyToVar.keys())
  for (const v of enabled) {
    deps.set(v.key, extractVarRefs(v.value).filter((r) => enabledKeys.has(r)))
  }

  const sorted: string[] = []
  const visited = new Set<string>()

  function visit(key: string): void {
    if (visited.has(key)) return
    visited.add(key)
    for (const dep of deps.get(key) ?? []) {
      visit(dep)
    }
    sorted.push(key)
  }

  for (const key of enabledKeys) {
    visit(key)
  }

  const sortedVars = sorted.map((k) => keyToVar.get(k)!).filter(Boolean)
  const disabled = pathVariables.filter((v) => !v.enabled)
  return [...sortedVars, ...disabled]
}

/** 将路径变量引用 {{VAR}} 替换为字面值（支持嵌套引用，按拓扑序逐层展开） */
export function resolvePathVarRefs(text: string, pathVariables: PathVariable[]): string {
  const enabledVars = pathVariables.filter((v) => v.enabled && v.key)
  if (enabledVars.length === 0) return text

  // 先将路径变量自身按拓扑排序展开（被引用的先解析）
  const sorted = topoSortPathVariables(enabledVars)
  const resolvedMap = new Map<string, string>()

  for (const v of sorted) {
    let resolved = v.value
    for (const [key, val] of resolvedMap) {
      resolved = resolved.replaceAll(`{{${key}}}`, val)
    }
    resolvedMap.set(v.key, resolved)
  }

  // 用展开后的值替换文本中的引用
  return text.replace(new RegExp(VAR_REF_RE.source, 'g'), (full, name) => {
    const literal = resolvedMap.get(name)
    return literal !== undefined ? literal : full
  })
}

/** 将 {{VAR}} 转换为目标 shell 的引用语法 */
export function resolveVarRefs(text: string, shellType: ShellType): string {
  return text.replace(new RegExp(VAR_REF_RE.source, 'g'), (_, name) => {
    if (shellType === 'powershell') {
      return `$env:${name}`
    }
    return `\${${name}}`
  })
}

/** 拓扑排序变量，被引用的排在前面。使用 DFS 后序遍历 */
export function topoSortVariables(variables: ShellVariable[]): ShellVariable[] {
  const enabled = variables.filter((v) => v.enabled && v.key)
  if (enabled.length <= 1) return variables

  const keyToVar = new Map<string, ShellVariable>()
  const deps = new Map<string, string[]>()

  for (const v of enabled) {
    keyToVar.set(v.key, v)
  }
  const enabledKeys = new Set(keyToVar.keys())
  for (const v of enabled) {
    deps.set(v.key, extractVarRefs(v.value).filter((r) => enabledKeys.has(r)))
  }

  const sorted: string[] = []
  const visited = new Set<string>()

  function visit(key: string): void {
    if (visited.has(key)) return
    visited.add(key)
    for (const dep of deps.get(key) ?? []) {
      visit(dep)
    }
    sorted.push(key)
  }

  for (const key of enabledKeys) {
    visit(key)
  }

  const sortedVars = sorted.map((k) => keyToVar.get(k)!).filter(Boolean)
  const disabled = variables.filter((v) => !v.enabled)
  return [...sortedVars, ...disabled]
}
