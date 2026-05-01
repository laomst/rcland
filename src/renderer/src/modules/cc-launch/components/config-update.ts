import type { ConfigSet } from '@shared/types'

export type ConfigFormValues = Pick<
  ConfigSet,
  'providerId' | 'endpointId' | 'keyId' | 'name' | 'funcName' | 'envVars' | 'localOnly'
>

export function createConfigUpdatePatch(values: ConfigFormValues): Partial<ConfigSet> {
  return {
    providerId: values.providerId,
    endpointId: values.endpointId,
    keyId: values.keyId,
    name: values.name,
    funcName: values.funcName,
    envVars: values.envVars,
    localOnly: values.localOnly
  }
}
