import type { Provider, LaunchItem } from './cc-launch'
import type { CXProvider, CXLaunchItem } from './cx-launch'
import type { OCProvider, OCLaunchItem } from './oc-launch'

export interface LocalCCLaunchData {
  version: 1
  providers: Provider[]
  launchItems: LaunchItem[]
}

export function createEmptyLocalCCLaunchData(): LocalCCLaunchData {
  return { version: 1, providers: [], launchItems: [] }
}

export interface LocalCXLandData {
  version: 1
  providers: CXProvider[]
  launchItems: CXLaunchItem[]
}

export function createEmptyLocalCXLandData(): LocalCXLandData {
  return { version: 1, providers: [], launchItems: [] }
}

export interface LocalOCLandData {
  version: 1
  providers: OCProvider[]
  launchItems: OCLaunchItem[]
}

export function createEmptyLocalOCLandData(): LocalOCLandData {
  return { version: 1, providers: [], launchItems: [] }
}
