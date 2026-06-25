import { homedir } from 'os'
import { join, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import type { McpServer } from '@shared/types'

export const CC_MCP_CONFIG_DIR = join(homedir(), '.rcland', 'mcp')

export function buildCCMcpConfigContent(servers: McpServer[]): string {
  const mcpServers: Record<string, Record<string, unknown>> = {}
  for (const s of servers) {
    if (s.type === 'stdio') {
      const entry: Record<string, unknown> = { command: s.command }
      if (s.args && s.args.length > 0) entry.args = s.args
      if (s.env && Object.keys(s.env).length > 0) entry.env = s.env
      if (s.cwd) entry.cwd = s.cwd
      mcpServers[s.key] = entry
    } else {
      const entry: Record<string, unknown> = { type: 'url', url: s.url }
      if (s.headers && Object.keys(s.headers).length > 0) entry.headers = s.headers
      mcpServers[s.key] = entry
    }
  }
  return JSON.stringify({ mcpServers }, null, 2)
}

export interface CCMcpConfigFile {
  filePath: string
  content: string
}

export interface CCMcpConfigInput {
  itemId: string
  servers: McpServer[]
}

export function buildCCMcpConfigFiles(
  items: CCMcpConfigInput[],
  dir: string = CC_MCP_CONFIG_DIR
): CCMcpConfigFile[] {
  const files: CCMcpConfigFile[] = []
  for (const { itemId, servers } of items) {
    if (servers.length === 0) continue
    files.push({
      filePath: join(dir, `cc-${itemId}.json`),
      content: buildCCMcpConfigContent(servers)
    })
  }
  return files
}

export function writeCCMcpConfigFiles(files: CCMcpConfigFile[], dir: string = CC_MCP_CONFIG_DIR): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const keep = new Set(files.map((f) => basename(f.filePath)))
  for (const existing of readdirSync(dir)) {
    if (existing.startsWith('cc-') && existing.endsWith('.json') && !keep.has(existing)) {
      unlinkSync(join(dir, existing))
    }
  }
  for (const f of files) {
    writeFileSync(f.filePath, f.content, 'utf-8')
  }
}
