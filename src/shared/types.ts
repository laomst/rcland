import type { ShellType, ShellProfileConfig } from './shell'

// ============================================================
// Fixed Claude environment variable definitions
// ============================================================

export const CLAUDE_ENV_VAR_KEYS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'API_TIMEOUT_MS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS',
] as const

export type ClaudeEnvVarKey = (typeof CLAUDE_ENV_VAR_KEYS)[number]

export const CLAUDE_ENV_VAR_LABELS: Record<ClaudeEnvVarKey, string> = {
  ANTHROPIC_MODEL:                              '主模型',
  ANTHROPIC_DEFAULT_OPUS_MODEL:                 'Opus 模型',
  ANTHROPIC_DEFAULT_SONNET_MODEL:               'Sonnet 模型',
  ANTHROPIC_DEFAULT_HAIKU_MODEL:                'Haiku 模型',
  API_TIMEOUT_MS:                               'API 超时 (ms)',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:     '禁用非必要流量',
  CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS:       '禁用实验性 Beta',
}

/** A single env var with value + enabled toggle */
export interface EnvVarSetting {
  value: string
  enabled: boolean
}

/** All env vars for a config */
export type EnvVarsMap = Partial<Record<ClaudeEnvVarKey, EnvVarSetting>>

// ============================================================
// App Settings (per-device, stored in Electron userData)
// ============================================================

export interface AppSettings {
  configDir: string
  keyFilePath: string
  shellProfiles: Partial<Record<ShellType, ShellProfileConfig>>
}

// ============================================================
// Data Model v5 (stored in rcland.config.claudecode.json, syncable)
// ============================================================

export interface ProviderEndpoint {
  id: string
  label: string
  url: string
}

export interface ProviderKey {
  id: string
  /** Display label, e.g. "生产环境", "测试账号" */
  label: string
  /** Encrypted token (enc:v1:...) */
  token: string
  /** Optional comment/note */
  comment?: string
}

export interface CCLaunchData {
  version: 5
  providers: Provider[]
  configs: ConfigSet[]
  selector: {
    enabled: boolean
    funcName: string
    promptTitle: string
  }
}

export interface Provider {
  id: string
  name: string
  enabled: boolean
  /** Multiple endpoints (label + url pairs) */
  endpoints: ProviderEndpoint[]
  /** Multiple keys (label + token pairs) */
  keys: ProviderKey[]
  /** Custom accent color, e.g. '#1677ff' */
  color?: string
  /** Default template for new configs */
  template?: ProviderTemplate
}

export interface ProviderTemplate {
  /** Default env var values when creating a new config */
  envVars?: EnvVarsMap
}

export interface ConfigSet {
  id: string
  /** Foreign key to Provider */
  providerId: string
  /** Foreign key to ProviderEndpoint within the provider */
  endpointId: string
  /** Foreign key to ProviderKey within the provider */
  keyId: string
  /** Display name, e.g. "GLM-5.1 模型" */
  name: string
  /** Shell function name, e.g. "cc-glm5" */
  funcName: string
  enabled: boolean
  /** Fixed Claude env vars, each with value + enabled */
  envVars: EnvVarsMap
  /** @deprecated Use name instead - kept for backward compatibility during migration */
  description?: string
}

/** Get key token by providerId and keyId */
export function getKeyToken(
  providers: Provider[],
  providerId: string,
  keyId: string
): { token: string; label: string } | null {
  const provider = providers.find((p) => p.id === providerId)
  if (!provider) return null
  const key = provider.keys.find((k) => k.id === keyId)
  if (!key) return null
  return { token: key.token, label: key.label }
}

/** Get key by providerId and keyId */
export function getKey(
  providers: Provider[],
  providerId: string,
  keyId: string
): ProviderKey | null {
  const provider = providers.find((p) => p.id === providerId)
  if (!provider) return null
  return provider.keys.find((k) => k.id === keyId) ?? null
}

/** Create empty key with defaults */
export function createEmptyKey(): ProviderKey {
  return {
    id: crypto.randomUUID(),
    label: '',
    token: '',
    comment: ''
  }
}

/** Get the URL for a config's endpoint, falling back to the first endpoint */
export function getEndpointUrl(provider: Provider, endpointId?: string): string {
  if (!provider.endpoints || provider.endpoints.length === 0) return ''
  const ep = endpointId
    ? provider.endpoints.find((e) => e.id === endpointId)
    : null
  return ep?.url ?? provider.endpoints[0].url
}

// ============================================================
// Legacy v4 types (for migration only)
// ============================================================

export interface ProviderV4 {
  id: string
  name: string
  enabled: boolean
  endpoints: ProviderEndpoint[]
  color?: string
  template?: ProviderTemplate
}

export interface ConfigSetV4 {
  id: string
  providerId: string
  endpointId: string
  funcName: string
  description: string
  enabled: boolean
  token: string
  tokenComment: string
  envVars: EnvVarsMap
}

export interface CCLaunchDataV4 {
  version: 4
  providers: ProviderV4[]
  configs: ConfigSetV4[]
  selector: CCLaunchData['selector']
}

// ============================================================
// Legacy v3 types (for migration only)
// ============================================================

export interface ProviderV3 {
  id: string
  name: string
  enabled: boolean
  baseUrl: string
  color?: string
  template?: ProviderTemplate
}

export interface ConfigSetV3 {
  id: string
  providerId: string
  funcName: string
  description: string
  enabled: boolean
  token: string
  tokenComment: string
  envVars: EnvVarsMap
}

export interface CCLaunchDataV3 {
  version: 3
  providers: ProviderV3[]
  configs: ConfigSetV3[]
  selector: CCLaunchData['selector']
}

// ============================================================
// Legacy v2 types (for migration only)
// ============================================================

export interface ProviderV2 {
  id: string
  name: string
  enabled: boolean
  baseUrl: string
  color?: string
  configs: ConfigSetV2[]
}

export interface ConfigSetV2 {
  id: string
  funcName: string
  description: string
  enabled: boolean
  token: string
  tokenComment: string
  envVars: EnvVarsMap
}

export interface CCLaunchDataV2 {
  version: 2
  providers: ProviderV2[]
  selector: CCLaunchData['selector']
}
