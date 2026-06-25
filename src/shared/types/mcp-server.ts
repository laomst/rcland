export type McpServerType = 'stdio' | 'remote'

export const MCP_KEY_RE = /^[A-Za-z0-9_-]+$/

export interface McpServer {
  id: string
  name: string
  key: string
  enabled: boolean
  type: McpServerType
  // stdio
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  // remote
  url?: string
  headers?: Record<string, string>
  bearerTokenEnvVar?: string
  oauth?: boolean
  // common
  startupTimeout?: number
  toolTimeout?: number
}

export interface McpServersData {
  version: 1
  servers: McpServer[]
}

export function createEmptyMcpServersData(): McpServersData {
  return { version: 1, servers: [] }
}

export function normalizeMcpServersData(data: unknown): McpServersData {
  if (!data || typeof data !== 'object') return createEmptyMcpServersData()
  const obj = data as Partial<McpServersData>
  if (obj.version !== 1 || !Array.isArray(obj.servers)) return createEmptyMcpServersData()
  return obj as McpServersData
}
