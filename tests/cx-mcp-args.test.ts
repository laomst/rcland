// tests/cx-mcp-args.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBashCXMcpArgs, buildPowerShellCXMcpArgs } from '../src/main/services/generators/sections/cxland/codex-args'
import type { McpServer } from '../src/shared/types/mcp-server'

function stdioServer(over: Partial<McpServer> = {}): McpServer {
  return {
    id: 's1', name: 'Playwright', key: 'playwright', enabled: true,
    type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp'],
    ...over
  }
}

function remoteServer(over: Partial<McpServer> = {}): McpServer {
  return {
    id: 'r1', name: 'Remote', key: 'remote-tool', enabled: true,
    type: 'remote', url: 'https://mcp.example.com',
    bearerTokenEnvVar: 'MCP_TOKEN',
    ...over
  }
}

test('buildBashCXMcpArgs stdio server produces command and args', () => {
  const args = buildBashCXMcpArgs([stdioServer()])
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.command="npx"')))
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.args=')))
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.transport="stdio"')))
})

test('buildBashCXMcpArgs remote server produces url and bearer_token_env_var', () => {
  const args = buildBashCXMcpArgs([remoteServer()])
  assert.ok(args.some(a => a.includes('mcp_servers.remote-tool.url="https://mcp.example.com"')))
  assert.ok(args.some(a => a.includes('mcp_servers.remote-tool.bearer_token_env_var="MCP_TOKEN"')))
})

test('buildBashCXMcpArgs empty servers returns empty array', () => {
  assert.deepEqual(buildBashCXMcpArgs([]), [])
})

test('buildBashCXMcpArgs stdio with env produces env entries', () => {
  const s = stdioServer({ env: { FOO: 'bar' } })
  const args = buildBashCXMcpArgs([s])
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.env.FOO="bar"')))
})

test('buildBashCXMcpArgs stdio with timeouts', () => {
  const s = stdioServer({ startupTimeout: 30, toolTimeout: 60 })
  const args = buildBashCXMcpArgs([s])
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.startup_timeout_sec=30')))
  assert.ok(args.some(a => a.includes('mcp_servers.playwright.tool_timeout_sec=60')))
})

test('buildPowerShellCXMcpArgs produces PS-escaped args', () => {
  const args = buildPowerShellCXMcpArgs([stdioServer()])
  assert.ok(args.length > 0)
  assert.ok(args.every(a => typeof a === 'string'))
})
