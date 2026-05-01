import test from 'node:test'
import assert from 'node:assert/strict'
import { readOsProxy } from '../src/main/services/os-proxy-reader'

test('readOsProxy returns SystemProxyConfig with 4 env vars', () => {
  const result = readOsProxy()
  assert.equal(result.proxyEnvVars.length, 4)
  const types = result.proxyEnvVars.map(v => v.type)
  assert.deepEqual(types, ['http', 'https', 'all', 'no'])
})

test('readOsProxy returns string values for all entries', () => {
  const result = readOsProxy()
  for (const item of result.proxyEnvVars) {
    assert.equal(typeof item.value, 'string')
  }
})
