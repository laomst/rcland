import type { LaunchItem, Provider } from '@shared/types'

export type LaunchItemFormValues = Pick<
  LaunchItem,
  'providerId' | 'endpointId' | 'keyId' | 'name' | 'funcName' | 'envVars' | 'localOnly' | 'passthrough' | 'passthroughCommand' | 'useSystemProxy' | 'mcpMode' | 'mcpServerIds'
>

export function createLaunchItemUpdatePatch(values: LaunchItemFormValues): Partial<LaunchItem> {
  const patch: Partial<LaunchItem> = {
    providerId: values.providerId,
    endpointId: values.endpointId,
    keyId: values.keyId,
    name: values.name,
    funcName: values.funcName,
    envVars: values.envVars,
    localOnly: values.localOnly
  }

  if (values.passthrough !== undefined) patch.passthrough = values.passthrough
  if (values.passthroughCommand !== undefined) patch.passthroughCommand = values.passthroughCommand
  if (values.useSystemProxy !== undefined) patch.useSystemProxy = values.useSystemProxy
  if (values.mcpMode !== undefined) patch.mcpMode = values.mcpMode
  if (values.mcpServerIds !== undefined) patch.mcpServerIds = values.mcpServerIds

  return patch
}

export function deriveCommonValuesMap(
  provider: Provider | undefined
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const envVars = provider?.template?.envVars ?? {}
  for (const [key, setting] of Object.entries(envVars)) {
    if (setting.commonValues && setting.commonValues.length > 0) {
      result[key] = setting.commonValues
    }
  }
  return result
}
