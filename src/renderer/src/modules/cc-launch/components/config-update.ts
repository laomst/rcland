import type { ConfigSet } from '@shared/types'

export type ConfigFormValues = Pick<
  ConfigSet,
  'providerId' | 'endpointId' | 'keyId' | 'name' | 'funcName' | 'envVars' | 'localOnly' | 'passthrough' | 'useSystemProxy'
>

export function createConfigUpdatePatch(values: ConfigFormValues): Partial<ConfigSet> {
  const patch: Partial<ConfigSet> = {
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
