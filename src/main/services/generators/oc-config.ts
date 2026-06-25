import { homedir } from 'os'
import { join, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import type { OCLandData, OCProvider, OCLaunchItem, McpServersData } from '@shared/types'
import { sdkTypeToNpm, getOCEndpointUrl } from '@shared/types'
import type { McpServer } from '@shared/types'
import { resolveMcpServers } from '@shared/mcp-resolve'

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
export function buildOCConfigContent(provider: OCProvider, item: OCLaunchItem, mcpServers: McpServer[] = []): string {
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

  const config: Record<string, unknown> = {
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

  if (mcpServers.length > 0) {
    const mcp: Record<string, Record<string, unknown>> = {}
    for (const s of mcpServers) {
      if (s.type === 'stdio') {
        const entry: Record<string, unknown> = {
          type: 'local',
          command: [s.command, ...(s.args ?? [])]
        }
        if (s.env && Object.keys(s.env).length > 0) entry.environment = s.env
        if (s.cwd) entry.cwd = s.cwd
        if (s.toolTimeout != null) entry.timeout = s.toolTimeout * 1000
        mcp[s.key] = entry
      } else {
        const entry: Record<string, unknown> = { type: 'remote', url: s.url }
        if (s.headers && Object.keys(s.headers).length > 0) entry.headers = s.headers
        if (s.oauth) entry.oauth = s.oauth
        if (s.toolTimeout != null) entry.timeout = s.toolTimeout * 1000
        mcp[s.key] = entry
      }
    }
    config.mcp = mcp
  }

  return JSON.stringify(config, null, 2)
}

export interface OCConfigFile {
  filePath: string
  content: string
}

/**
 * Write config files to disk and prune orphan *.json no longer in `files`.
 * `dir` defaults to OC_CONFIG_DIR (override for tests).
 */
export function writeOCConfigFiles(files: OCConfigFile[], dir: string = OC_CONFIG_DIR): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const keep = new Set(files.map((f) => basename(f.filePath)))
  for (const existing of readdirSync(dir)) {
    if (existing.endsWith('.json') && !keep.has(existing)) {
      unlinkSync(join(dir, existing))
    }
  }
  for (const f of files) {
    writeFileSync(f.filePath, f.content, 'utf-8')
  }
}

/** Emit one config file per enabled, non-passthrough launch item with a valid provider. */
export function buildOCConfigFiles(data: OCLandData, mcpServersData?: McpServersData): OCConfigFile[] {
  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const files: OCConfigFile[] = []
  for (const item of data.launchItems) {
    if (!item.enabled || item.passthrough) continue
    const provider = providerMap.get(item.providerId)
    if (!provider || !provider.enabled) continue
    // Skip items whose endpoint resolves to an empty baseURL; the shell
    // generator surfaces these as error stubs instead.
    if (!getOCEndpointUrl(provider, item.endpointId)) continue
    const mcpServers = mcpServersData ? resolveMcpServers(item, provider, mcpServersData.servers) : []
    files.push({
      filePath: join(OC_CONFIG_DIR, `${assertSafeOCConfigId(item.id)}.json`),
      content: buildOCConfigContent(provider, item, mcpServers)
    })
  }
  return files
}
