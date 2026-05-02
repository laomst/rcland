import { readFileSync, existsSync } from 'fs'
import type { LocalCCLaunchData } from '@shared/types'
import { createEmptyLocalCCLaunchData } from '@shared/types'

/**
 * Pure helper for testability: takes an explicit path so tests do not need
 * an Electron runtime. Lives in its own module so esbuild does not bundle
 * the `import { app } from 'electron'` from local-cc-config.ts when tests
 * import this function.
 */
export function loadLocalCCConfigFrom(filePath: string): LocalCCLaunchData {
  if (!existsSync(filePath)) return createEmptyLocalCCLaunchData()
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (parsed?.version !== 1 || !Array.isArray(parsed.providers) || !Array.isArray(parsed.configs)) {
      return createEmptyLocalCCLaunchData()
    }
    return parsed as LocalCCLaunchData
  } catch {
    return createEmptyLocalCCLaunchData()
  }
}
