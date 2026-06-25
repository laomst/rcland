import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join as pjoin } from 'node:path'
import { buildCCMcpConfigContent, buildCCMcpConfigFiles, writeCCMcpConfigFiles } from '../src/main/services/generators/cc-mcp-config'
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
    headers: { 'Authorization': 'Bearer xxx' },
    ...over
  }
}

test('buildCCMcpConfigContent generates stdio server', () => {
  const json = JSON.parse(buildCCMcpConfigContent([stdioServer()]))
  assert.deepEqual(json.mcpServers.playwright, {
    command: 'npx',
    args: ['-y', '@playwright/mcp']
  })
})

test('buildCCMcpConfigContent generates remote server with type url', () => {
  const json = JSON.parse(buildCCMcpConfigContent([remoteServer()]))
  assert.equal(json.mcpServers['remote-tool'].type, 'url')
  assert.equal(json.mcpServers['remote-tool'].url, 'https://mcp.example.com')
  assert.deepEqual(json.mcpServers['remote-tool'].headers, { Authorization: 'Bearer xxx' })
})

test('buildCCMcpConfigContent includes env and cwd for stdio', () => {
  const s = stdioServer({ env: { FOO: 'bar' }, cwd: '/tmp' })
  const json = JSON.parse(buildCCMcpConfigContent([s]))
  assert.deepEqual(json.mcpServers.playwright.env, { FOO: 'bar' })
  assert.equal(json.mcpServers.playwright.cwd, '/tmp')
})

test('buildCCMcpConfigContent returns empty mcpServers for empty list', () => {
  const json = JSON.parse(buildCCMcpConfigContent([]))
  assert.deepEqual(json.mcpServers, {})
})

test('buildCCMcpConfigFiles returns one file per item with MCP', () => {
  const files = buildCCMcpConfigFiles(
    [{ itemId: 'item-1', servers: [stdioServer()] }]
  )
  assert.equal(files.length, 1)
  assert.ok(files[0].filePath.includes('cc-item-1.json'))
})

test('buildCCMcpConfigFiles skips items with empty servers', () => {
  const files = buildCCMcpConfigFiles(
    [{ itemId: 'item-1', servers: [] }]
  )
  assert.equal(files.length, 0)
})

test('writeCCMcpConfigFiles writes and prunes', () => {
  const dir = mkdtempSync(pjoin(tmpdir(), 'cc-mcp-'))
  try {
    writeFileSync(pjoin(dir, 'cc-old.json'), '{}')
    const files = [{ filePath: pjoin(dir, 'cc-item-1.json'), content: '{"a":1}' }]
    writeCCMcpConfigFiles(files, dir)
    assert.ok(existsSync(pjoin(dir, 'cc-item-1.json')))
    assert.ok(!existsSync(pjoin(dir, 'cc-old.json')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
