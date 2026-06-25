import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveMcpServers } from '../src/shared/mcp-resolve'
import type { McpServer } from '../src/shared/types/mcp-server'

function server(over: Partial<McpServer> = {}): McpServer {
  return {
    id: 'g1', name: 'Global MCP', key: 'global-mcp', enabled: true,
    type: 'stdio', command: 'npx', args: ['-y', 'pkg'],
    ...over
  }
}

test('inherit mode returns provider effective list', () => {
  const global = [server({ id: 'g1', key: 'g1' }), server({ id: 'g2', key: 'g2' })]
  const providerPrivate = [server({ id: 'p1', key: 'p1' })]
  const result = resolveMcpServers(
    {},
    { mcpServers: providerPrivate, mcpServerRefs: ['g1'] },
    global
  )
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(s => s.id).sort(), ['g1', 'p1'])
})

test('inherit mode skips disabled servers', () => {
  const global = [server({ id: 'g1', key: 'g1', enabled: false })]
  const result = resolveMcpServers(
    {},
    { mcpServers: [], mcpServerRefs: ['g1'] },
    global
  )
  assert.equal(result.length, 0)
})

test('inherit mode skips disabled private servers', () => {
  const providerPrivate = [server({ id: 'p1', key: 'p1', enabled: false })]
  const result = resolveMcpServers(
    {},
    { mcpServers: providerPrivate, mcpServerRefs: [] },
    []
  )
  assert.equal(result.length, 0)
})

test('custom mode picks from global + private by mcpServerIds', () => {
  const global = [server({ id: 'g1', key: 'g1' }), server({ id: 'g2', key: 'g2' })]
  const providerPrivate = [server({ id: 'p1', key: 'p1' })]
  const result = resolveMcpServers(
    { mcpMode: 'custom', mcpServerIds: ['g2', 'p1'] },
    { mcpServers: providerPrivate, mcpServerRefs: ['g1'] },
    global
  )
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(s => s.id).sort(), ['g2', 'p1'])
})

test('custom mode skips disabled even if referenced', () => {
  const global = [server({ id: 'g1', key: 'g1', enabled: false })]
  const result = resolveMcpServers(
    { mcpMode: 'custom', mcpServerIds: ['g1'] },
    { mcpServers: [], mcpServerRefs: [] },
    global
  )
  assert.equal(result.length, 0)
})

test('deduplicates by id', () => {
  const global = [server({ id: 'g1', key: 'g1' })]
  const providerPrivate = [server({ id: 'g1', key: 'g1-dup' })]
  const result = resolveMcpServers(
    {},
    { mcpServers: providerPrivate, mcpServerRefs: ['g1'] },
    global
  )
  assert.equal(result.length, 1)
})

test('empty provider fields treated as empty arrays', () => {
  const result = resolveMcpServers({}, {}, [])
  assert.equal(result.length, 0)
})
