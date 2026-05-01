import type { TFunction } from 'i18next'

export const SYSTEM_PROXY_TYPES = [
  'http',
  'https',
  'all',
  'no',
] as const

export type SystemProxyType = (typeof SYSTEM_PROXY_TYPES)[number]

export interface SystemProxyEnvVar {
  type: SystemProxyType
  value: string
}

export interface SystemProxyConfig {
  proxyEnvVars: SystemProxyEnvVar[]
}

const SYSTEM_PROXY_ENV_TO_TYPE: Record<string, SystemProxyType> = {
  HTTP_PROXY: 'http',
  http_proxy: 'http',
  HTTPS_PROXY: 'https',
  https_proxy: 'https',
  ALL_PROXY: 'all',
  all_proxy: 'all',
  NO_PROXY: 'no',
  no_proxy: 'no',
}

export function getSystemProxyLabels(t: TFunction): Record<SystemProxyType, string> {
  return {
    http: t('systemProxy.proxyTypes.http'),
    https: t('systemProxy.proxyTypes.https'),
    all: t('systemProxy.proxyTypes.all'),
    no: t('systemProxy.proxyTypes.no'),
  }
}

export function createEmptySystemProxyConfig(): SystemProxyConfig {
  return {
    proxyEnvVars: SYSTEM_PROXY_TYPES.map((type) => ({
      type,
      value: '',
    })),
  }
}

export function getSystemProxyEnvNames(type: SystemProxyType): [string, string] {
  switch (type) {
    case 'http': return ['http_proxy', 'HTTP_PROXY']
    case 'https': return ['https_proxy', 'HTTPS_PROXY']
    case 'all': return ['all_proxy', 'ALL_PROXY']
    case 'no': return ['no_proxy', 'NO_PROXY']
  }
}

export const SYSTEM_PROXY_ENV_NAMES = SYSTEM_PROXY_TYPES.flatMap((type) => getSystemProxyEnvNames(type))

function unquoteSystemProxyValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2) return trimmed

  const quote = trimmed[0]
  if ((quote === "'" || quote === '"') && trimmed[trimmed.length - 1] === quote) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function splitSystemProxyAssignments(input: string): string[] {
  const assignments: string[] = []
  let current = ''
  let quote: "'" | '"' | null = null
  let escaped = false

  for (const char of input.trim()) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      current += char
      escaped = true
      continue
    }

    if ((char === "'" || char === '"') && quote === null) {
      quote = char
      current += char
      continue
    }

    if (char === quote) {
      quote = null
      current += char
      continue
    }

    if (/\s/.test(char) && quote === null) {
      if (current.trim()) assignments.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (quote) throw new Error('Unterminated quote in system proxy export statement')
  if (current.trim()) assignments.push(current.trim())
  return assignments
}

export function getSystemProxyTypeFromEnvName(name: string): SystemProxyType | null {
  return SYSTEM_PROXY_ENV_TO_TYPE[name.trim()] ?? null
}

export function parseSystemProxyExportScript(script: string): SystemProxyEnvVar[] {
  const items: SystemProxyEnvVar[] = []

  for (const line of script.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = /^export\s+(.+)$/.exec(trimmed)
    if (!match) {
      throw new Error(`Only export statements are supported in system proxy settings: ${trimmed}`)
    }

    for (const assignment of splitSystemProxyAssignments(match[1])) {
      const assignmentMatch = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(assignment)
      if (!assignmentMatch) {
        throw new Error(`Only KEY=value assignments are supported in system proxy settings: ${assignment}`)
      }

      const type = getSystemProxyTypeFromEnvName(assignmentMatch[1])
      if (!type) continue

      const value = unquoteSystemProxyValue(assignmentMatch[2])
      if (!value) continue
      items.push({ type, value })
    }
  }

  return items
}

export function mergeSystemProxyEnvVars(
  current: SystemProxyEnvVar[],
  imported: SystemProxyEnvVar[]
): SystemProxyEnvVar[] {
  const byType = new Map<SystemProxyType, string>()

  for (const item of current) {
    if (SYSTEM_PROXY_TYPES.includes(item.type)) {
      byType.set(item.type, item.value ?? '')
    }
  }

  for (const item of imported) {
    if (SYSTEM_PROXY_TYPES.includes(item.type)) {
      byType.set(item.type, item.value ?? '')
    }
  }

  return SYSTEM_PROXY_TYPES.map((type) => ({
    type,
    value: byType.get(type) ?? '',
  }))
}

export function normalizeSystemProxyConfig(value: unknown): SystemProxyConfig {
  if (!value || typeof value !== 'object') return createEmptySystemProxyConfig()
  const obj = value as Partial<SystemProxyConfig>

  if (!Array.isArray(obj.proxyEnvVars)) {
    return createEmptySystemProxyConfig()
  }

  return {
    proxyEnvVars: mergeSystemProxyEnvVars([], obj.proxyEnvVars),
  }
}
