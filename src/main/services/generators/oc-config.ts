import { homedir } from 'os'
import { join } from 'path'
import type { OCLandData, OCProvider, OCLaunchItem } from '@shared/types'
import { sdkTypeToNpm, getOCEndpointUrl } from '@shared/types'

export const OC_CONFIG_DIR = join(homedir(), '.rcland', 'opencode')

/** UUID-style ids only (alphanumerics + hyphen). Guards path/env-name injection. */
export function assertSafeOCConfigId(id: string): string {
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    throw new Error(`Unsafe OCLand launch item id: ${JSON.stringify(id)}`)
  }
  return id
}

/** RCLAND_OC_<id>_KEY. Converts hyphens to underscores; id must be UUID-style (alphanumeric + hyphen). */
export function ocKeyEnvVarName(launchItemId: string): string {
  return `RCLAND_OC_${assertSafeOCConfigId(launchItemId).replace(/-/g, '_')}_KEY`
}

interface OCModelJson {
  name: string
  limit?: { context?: number; output?: number }
}

/** Build the opencode.json content (string) for one launch item's provider. */
export function buildOCConfigContent(provider: OCProvider, item: OCLaunchItem): string {
  const models: Record<string, OCModelJson> = {}
  for (const m of provider.models) {
    const entry: OCModelJson = { name: m.name }
    if (m.contextLimit != null || m.outputLimit != null) {
      entry.limit = {}
      if (m.contextLimit != null) entry.limit.context = m.contextLimit
      if (m.outputLimit != null) entry.limit.output = m.outputLimit
    }
    models[m.id] = entry
  }

  const config = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      [provider.id]: {
        npm: sdkTypeToNpm(provider.sdkType),
        name: provider.name,
        options: {
          baseURL: getOCEndpointUrl(provider, item.endpointId),
          apiKey: `{env:${ocKeyEnvVarName(item.id)}}`
        },
        models
      }
    }
  }
  return JSON.stringify(config, null, 2)
}

export interface OCConfigFile {
  filePath: string
  content: string
}

/** Emit one config file per enabled, non-passthrough launch item with a valid provider. */
export function buildOCConfigFiles(data: OCLandData): OCConfigFile[] {
  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const files: OCConfigFile[] = []
  for (const item of data.launchItems) {
    if (!item.enabled || item.passthrough) continue
    const provider = providerMap.get(item.providerId)
    if (!provider || !provider.enabled) continue
    // Skip items whose endpoint resolves to an empty baseURL; the shell
    // generator surfaces these as error stubs instead.
    if (!getOCEndpointUrl(provider, item.endpointId)) continue
    files.push({
      filePath: join(OC_CONFIG_DIR, `${assertSafeOCConfigId(item.id)}.json`),
      content: buildOCConfigContent(provider, item)
    })
  }
  return files
}
