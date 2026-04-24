import type { ShellType, ShellProfileConfig } from './shell'
import type { TFunction } from 'i18next'

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

export const getClaudeEnvVarLabels = (t: TFunction): Record<ClaudeEnvVarKey, string> => ({
  ANTHROPIC_MODEL:                              t('shellEnv.claudeLabels.model'),
  ANTHROPIC_DEFAULT_OPUS_MODEL:                 t('shellEnv.claudeLabels.opusModel'),
  ANTHROPIC_DEFAULT_SONNET_MODEL:               t('shellEnv.claudeLabels.sonnetModel'),
  ANTHROPIC_DEFAULT_HAIKU_MODEL:                t('shellEnv.claudeLabels.haikuModel'),
  API_TIMEOUT_MS:                               t('shellEnv.claudeLabels.apiTimeout'),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:     t('shellEnv.claudeLabels.disableNonessentialTraffic'),
  CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS:       t('shellEnv.claudeLabels.disableExperimentalBetas'),
})

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

export type AppPage = '/env' | '/path' | '/functions' | '/aliases' | '/ccland'

export const getAppPageLabels = (t: TFunction): Record<AppPage, string> => ({
  '/env': t('nav.env'),
  '/path': t('nav.path'),
  '/functions': t('nav.functions'),
  '/aliases': t('nav.aliases'),
  '/ccland': t('nav.ccland'),
})

export interface AppSettings {
  configDir: string
  keyFilePath: string
  shellProfiles: Partial<Record<ShellType, ShellProfileConfig>>
  defaultPage?: AppPage
  language?: 'zh-CN' | 'en'
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
  /** Only stored locally, not synced */
  localOnly?: boolean
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
  /** Only stored locally, not synced */
  localOnly?: boolean
}

// ============================================================
// Local CC Config (stored in Electron userData, not synced)
// ============================================================

export interface LocalCCLaunchData {
  version: 1
  providers: Provider[]
  configs: ConfigSet[]
}

export function createEmptyLocalCCLaunchData(): LocalCCLaunchData {
  return { version: 1, providers: [], configs: [] }
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
