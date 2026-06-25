import type { McpServer } from './types/mcp-server'

interface McpProviderFields {
  mcpServers?: McpServer[]
  mcpServerRefs?: string[]
}

interface McpItemFields {
  mcpMode?: 'inherit' | 'custom'
  mcpServerIds?: string[]
}

export function resolveMcpServers(
  item: McpItemFields,
  provider: McpProviderFields,
  globalPool: McpServer[]
): McpServer[] {
  const privateServers = (provider.mcpServers ?? []).filter(s => s.enabled)
  const refsSet = new Set(provider.mcpServerRefs ?? [])
  const referencedGlobal = globalPool.filter(s => s.enabled && refsSet.has(s.id))

  if (item.mcpMode === 'custom') {
    const idsSet = new Set(item.mcpServerIds ?? [])
    const pool = [...privateServers, ...globalPool.filter(s => s.enabled)]
    const seen = new Set<string>()
    return pool.filter(s => {
      if (!idsSet.has(s.id) || seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  }

  // inherit
  const seen = new Set<string>()
  return [...privateServers, ...referencedGlobal].filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}
