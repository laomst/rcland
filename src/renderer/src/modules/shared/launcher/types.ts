/**
 * Shared launcher component types.
 * Both ProviderKey (cc) and CXProviderKey (cx) are structurally identical,
 * so the shared modal accepts the structural BaseProviderKey union.
 */
export interface BaseProviderKey {
  id: string
  label: string
  token: string
  comment?: string
}

export interface BaseLocalSelector {
  enabled: boolean
  funcName: string
  promptTitle?: string
  aliasEnabled?: boolean
  requireSessionName?: boolean
}

export interface BaseSelector {
  funcName: string
  promptTitle: string
  aliasEnabled?: boolean
  requireSessionName?: boolean
  localSelector?: BaseLocalSelector
}
