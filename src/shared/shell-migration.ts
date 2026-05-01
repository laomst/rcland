import type { ShellConfigData } from './shell-types'
import { createEmptyShellConfig } from './builtin-functions'

/**
 * Migrate shell config data from any version to latest.
 * Currently only v1 exists, so this just validates structure.
 */
export function migrateShellConfig(data: unknown): ShellConfigData {
  if (!data || typeof data !== 'object') {
    return createEmptyShellConfig()
  }

  const obj = data as Record<string, unknown>
  const version = typeof obj.version === 'number' ? obj.version : 0

  if (version < 1) {
    return createEmptyShellConfig()
  }

  // Future migrations:
  // if (version < 2) data = migrateShellV1ToV2(data)

  const config = data as ShellConfigData
  const defaults = createEmptyShellConfig()
  return {
    ...defaults,
    ...config,
    variables: Array.isArray(config.variables) ? config.variables : [],
    pathEntries: Array.isArray(config.pathEntries) ? config.pathEntries : [],
    functions: Array.isArray(config.functions) ? config.functions : [],
    aliases: Array.isArray(config.aliases) ? config.aliases : [],
    prompt: config.prompt ?? defaults.prompt,
    output: config.output ?? defaults.output,
  }
}
