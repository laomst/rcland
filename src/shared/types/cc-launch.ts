/** A single env var with value + enabled toggle */
export interface EnvVarSetting {
  value: string
  enabled: boolean
}

/** All env vars for a config (key 由 Claude Env Dict 统一维护) */
export type EnvVarsMap = Record<string, EnvVarSetting>

export interface ProviderEndpoint {
  id: string
  label: string
  url: string
  useSystemProxy?: boolean
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

export interface ProviderTemplate {
  /** Default env var values when creating a new config */
  envVars?: EnvVarsMap
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
  /** Passthrough mode: just run claude directly without provider/endpoint/key */
  passthrough?: boolean
  /** Use system proxy (only meaningful when passthrough=true) */
  useSystemProxy?: boolean
  /** Only stored locally, not synced */
  localOnly?: boolean
}

export interface CCLaunchData {
  version: 5
  providers: Provider[]
  configs: ConfigSet[]
  selector: {
    funcName: string
    promptTitle: string
    aliasEnabled?: boolean
    /** Whether to require -n session name in selector function. Default: true */
    requireSessionName?: boolean
    localSelector?: {
      enabled: boolean
      funcName: string
      promptTitle?: string
      aliasEnabled?: boolean
      requireSessionName?: boolean
    }
  }
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
