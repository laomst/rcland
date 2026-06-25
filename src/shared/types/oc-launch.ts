import type { McpServer } from './mcp-server'

export interface OCEndpoint {
  id: string
  label: string
  /** → provider.<id>.options.baseURL */
  url: string
  useSystemProxy?: boolean
}

export interface OCProviderKey {
  id: string
  label: string
  /** Encrypted token (enc:v1:...) */
  token: string
  comment?: string
}

export interface OCModel {
  /** → models.<id>; launch uses provider/<id> */
  id: string
  /** → models.<id>.name */
  name: string
  /** → models.<id>.limit.context */
  contextLimit?: number
  /** → models.<id>.limit.output */
  outputLimit?: number
}

export type OCSdkType = 'anthropic' | 'openai-compatible'

export interface OCProvider {
  id: string
  name: string
  enabled: boolean
  /** opencode-specific: decides the npm SDK package */
  sdkType: OCSdkType
  endpoints: OCEndpoint[]
  keys: OCProviderKey[]
  /** opencode-specific: model list written into config JSON */
  models: OCModel[]
  color?: string
  localOnly?: boolean
  kanbanUrl?: string
  mcpServers?: McpServer[]
  mcpServerRefs?: string[]
}

export interface OCLaunchItem {
  id: string
  providerId: string
  endpointId: string
  keyId: string
  name: string
  /** Shell function name, e.g. "oc-glm" */
  funcName: string
  enabled: boolean
  /** Optional; references a model id in provider.models (written into opencode config.json). Omits the -m flag if unset. */
  modelId?: string
  passthrough?: boolean
  /** Custom command for passthrough (defaults to 'opencode') */
  passthroughCommand?: string
  useSystemProxy?: boolean
  localOnly?: boolean
  mcpMode?: 'inherit' | 'custom'
  mcpServerIds?: string[]
}

export interface OCSelector {
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

export interface OCLandData {
  version: 2
  providers: OCProvider[]
  launchItems: OCLaunchItem[]
  selector: OCSelector
}

export function sdkTypeToNpm(sdkType: OCSdkType): string {
  return sdkType === 'anthropic' ? '@ai-sdk/anthropic' : '@ai-sdk/openai-compatible'
}

export function createEmptyOCLandData(): OCLandData {
  return {
    version: 2,
    providers: [],
    launchItems: [],
    selector: {
      funcName: 'oc',
      promptTitle: '选择 opencode 供应商',
      kanban: { funcName: 'show-oc-usage', enabled: false }
    }
  }
}

// v1 is the first version; no backward-compatibility migration needed (unlike CXLand).
export function normalizeOCLandData(data: unknown): OCLandData {
  if (!data || typeof data !== 'object') return createEmptyOCLandData()
  const raw = data as Record<string, unknown>
  if ((raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.providers) || !Array.isArray(raw.launchItems)) {
    return createEmptyOCLandData()
  }
  raw.version = 2
  const obj = data as Partial<OCLandData>
  // selector may be missing in hand-edited/partial data; fall back to the default so the
  // normalized object is self-contained rather than relying on downstream callers to patch it.
  if (!obj.selector || typeof obj.selector !== 'object') {
    return { ...(obj as OCLandData), selector: createEmptyOCLandData().selector }
  }
  return obj as OCLandData
}

export function getOCEndpointUrl(provider: OCProvider, endpointId?: string): string {
  if (!provider.endpoints || provider.endpoints.length === 0) return ''
  const ep = endpointId ? provider.endpoints.find((e) => e.id === endpointId) : null
  return ep?.url ?? provider.endpoints[0].url
}

export function getOCKey(provider: OCProvider, keyId: string): OCProviderKey | null {
  return provider.keys.find((k) => k.id === keyId) ?? null
}

export function createEmptyOCKey(): OCProviderKey {
  return { id: crypto.randomUUID(), label: '', token: '', comment: '' }
}
