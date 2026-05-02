import type { Provider, ConfigSet } from './cc-launch'
import type { CXProvider, CXConfigSet } from './cx-launch'

export interface LocalCCLaunchData {
  version: 1
  providers: Provider[]
  configs: ConfigSet[]
}

export function createEmptyLocalCCLaunchData(): LocalCCLaunchData {
  return { version: 1, providers: [], configs: [] }
}

export interface LocalCXLandData {
  version: 1
  providers: CXProvider[]
  configs: CXConfigSet[]
}

export function createEmptyLocalCXLandData(): LocalCXLandData {
  return { version: 1, providers: [], configs: [] }
}
