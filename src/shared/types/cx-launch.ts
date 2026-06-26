import type { McpServer } from './mcp-server'

export interface CXEndpoint {
  id: string
  label: string
  /** Codex base_url, e.g. https://api.example.com/v1 */
  url: string
  useSystemProxy?: boolean
}

export interface CXProviderKey {
  id: string
  label: string
  /** Encrypted token (enc:v1:...) */
  token: string
  comment?: string
}

export interface CXProvider {
  id: string
  name: string
  enabled: boolean
  /** Codex wire protocol; 'chat' for most third-party, 'responses' for OpenAI official */
  wireApi: 'responses' | 'chat'
  endpoints: CXEndpoint[]
  keys: CXProviderKey[]
  /** Custom accent color, e.g. '#1677ff' */
  color?: string
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
  /** Usage dashboard URL for this provider */
  kanbanUrl?: string
  mcpServers?: McpServer[]
  mcpServerRefs?: string[]
}

export interface CXLaunchItem {
  id: string
  /** Foreign key to CXProvider */
  providerId: string
  /** Foreign key to CXEndpoint within provider */
  endpointId: string
  /** Foreign key to CXProviderKey within provider */
  keyId: string
  /** Display name */
  name: string
  /** Shell function name, e.g. "cx-glm5" */
  funcName: string
  enabled: boolean
  /** Optional override for codex -c model="..." */
  model?: string
  /** Passthrough mode: just run codex directly without provider/endpoint/key */
  passthrough?: boolean
  /** Custom command name for passthrough mode (defaults to 'codex') */
  passthroughCommand?: string
  /** Use system proxy (only meaningful when passthrough=true) */
  useSystemProxy?: boolean
  /** 适用机器白名单（空/未设置 = 全部机器适用） */
  applicableMachines?: string[]
  mcpMode?: 'inherit' | 'custom'
  mcpServerIds?: string[]
}

export interface CXSelector {
  funcName: string
  promptTitle: string
  aliasEnabled?: boolean
  localSelector?: {
    enabled: boolean
    funcName: string
    promptTitle?: string
    aliasEnabled?: boolean
  }
  kanban?: {
    funcName: string
    enabled: boolean
  }
}

export interface CXLandData {
  version: 5
  providers: CXProvider[]
  launchItems: CXLaunchItem[]
  selector: CXSelector
}

export function createEmptyCXLandData(): CXLandData {
  return {
    version: 5,
    providers: [],
    launchItems: [],
    selector: { funcName: 'cx', promptTitle: '选择 Codex 供应商', kanban: { funcName: 'show-cx-usage', enabled: false } }
  }
}

export function normalizeCXLandData(data: unknown): CXLandData {
  if (!data || typeof data !== 'object') return createEmptyCXLandData()
  const raw = data as Record<string, unknown>
  if ((raw.version !== 3 && raw.version !== 4 && raw.version !== 5) || !Array.isArray(raw.providers)) {
    return createEmptyCXLandData()
  }
  raw.version = 5
  const obj = data as Partial<CXLandData>
  // Backward compatibility: accept both 'configs' (old) and 'launchItems' (new)
  const rawObj = obj as unknown as Record<string, unknown>
  if (!Array.isArray(rawObj.launchItems) && !Array.isArray(rawObj.configs)) {
    return createEmptyCXLandData()
  }
  // Map old 'configs' field to 'launchItems'
  if (!Array.isArray(rawObj.launchItems) && Array.isArray(rawObj.configs)) {
    rawObj.launchItems = rawObj.configs
  }
  // Clean up legacy selector fields
  if (obj.selector) {
    const s = obj.selector as unknown as Record<string, unknown>
    delete s['aliasName']
    delete s['enabled']
  }
  return obj as CXLandData
}

export function getCXEndpointUrl(provider: CXProvider, endpointId?: string): string {
  if (!provider.endpoints || provider.endpoints.length === 0) return ''
  const ep = endpointId
    ? provider.endpoints.find((e) => e.id === endpointId)
    : null
  return ep?.url ?? provider.endpoints[0].url
}

export function getCXKey(
  provider: CXProvider,
  keyId: string
): CXProviderKey | null {
  return provider.keys.find((k) => k.id === keyId) ?? null
}

export function createEmptyCXKey(): CXProviderKey {
  return {
    id: crypto.randomUUID(),
    label: '',
    token: '',
    comment: ''
  }
}
