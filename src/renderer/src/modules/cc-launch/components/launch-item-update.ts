import type { LaunchItem } from '@shared/types'

export type LaunchItemFormValues = Pick<
  LaunchItem,
  'providerId' | 'endpointId' | 'keyId' | 'name' | 'funcName' | 'envVars' | 'localOnly' | 'passthrough' | 'useSystemProxy'
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
  if (values.useSystemProxy !== undefined) patch.useSystemProxy = values.useSystemProxy

  return patch
}
