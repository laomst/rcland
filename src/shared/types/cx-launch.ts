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
  /** Only stored locally, not synced */
  localOnly?: boolean
  /** Usage dashboard URL for this provider */
  kanbanUrl?: string
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
  /** Use system proxy (only meaningful when passthrough=true) */
  useSystemProxy?: boolean
  /** Only stored locally, not synced */
  localOnly?: boolean
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
  version: 3
  providers: CXProvider[]
  launchItems: CXLaunchItem[]
  selector: CXSelector
}

export function createEmptyCXLandData(): CXLandData {
  return {
    version: 3,
    providers: [],
    launchItems: [],
    selector: { funcName: 'cx', promptTitle: '选择 Codex 供应商', kanban: { funcName: 'show-cx-usage', enabled: false } }
  }
}

export function normalizeCXLandData(data: unknown): CXLandData {
  if (!data || typeof data !== 'object') return createEmptyCXLandData()
  const obj = data as Partial<CXLandData>
  if (obj.version !== 3 || !Array.isArray(obj.providers)) {
    return createEmptyCXLandData()
  }
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
