import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyCXLandData,
  createEmptyLocalCXLandData,
  normalizeCXLandData,
  getCXEndpointUrl,
  getCXKey,
  createEmptyCXKey,
  type CXLandData,
  type CXProvider,
  type CXConfigSet
} from '../src/shared/types'

test('createEmptyCXLandData returns v3 with empty arrays and default selector', () => {
  const data = createEmptyCXLandData()
  assert.equal(data.version, 3)
  assert.deepEqual(data.providers, [])
  assert.deepEqual(data.configs, [])
  assert.deepEqual(data.selector, { enabled: false, funcName: 'cx', promptTitle: '选择 Codex 供应商' })
})

test('normalizeCXLandData discards v2 data and returns empty v3', () => {
  const v2 = {
    version: 2,
    providers: [{ id: 'official', name: '官方默认', builtIn: true, useSystemProxy: false }]
  }
  const result = normalizeCXLandData(v2)
  assert.equal(result.version, 3)
  assert.deepEqual(result.providers, [])
})

test('normalizeCXLandData accepts well-formed v3 data unchanged', () => {
  const provider: CXProvider = {
    id: 'p1',
    name: 'Test',
    enabled: true,
    wireApi: 'chat',
    endpoints: [{ id: 'e1', label: 'default', url: 'https://api.example.com/v1' }],
    keys: [{ id: 'k1', label: 'main', token: 'enc:v1:abc' }]
  }
  const config: CXConfigSet = {
    id: 'c1',
    name: 'GLM5',
    funcName: 'cx-glm5',
    enabled: true,
    providerId: 'p1',
    endpointId: 'e1',
    keyId: 'k1'
  }
  const v3: CXLandData = {
    version: 3,
    providers: [provider],
    configs: [config],
    selector: { enabled: true, funcName: 'cx', promptTitle: '选择' }
  }
  const result = normalizeCXLandData(v3)
  assert.deepEqual(result, v3)
})

test('normalizeCXLandData returns empty when input is not an object', () => {
  assert.deepEqual(normalizeCXLandData(null), createEmptyCXLandData())
  assert.deepEqual(normalizeCXLandData('garbage'), createEmptyCXLandData())
})

test('normalizeCXLandData returns empty when version is not 3', () => {
  assert.deepEqual(normalizeCXLandData({ version: 99, providers: [] }), createEmptyCXLandData())
})

test('getCXEndpointUrl returns the endpoint URL when found', () => {
  const provider: CXProvider = {
    id: 'p1',
    name: 'p',
    enabled: true,
    wireApi: 'chat',
    endpoints: [
      { id: 'e1', label: 'a', url: 'https://a.com/v1' },
      { id: 'e2', label: 'b', url: 'https://b.com/v1' }
    ],
    keys: []
  }
  assert.equal(getCXEndpointUrl(provider, 'e2'), 'https://b.com/v1')
})

test('getCXEndpointUrl falls back to first endpoint when id missing', () => {
  const provider: CXProvider = {
    id: 'p1',
    name: 'p',
    enabled: true,
    wireApi: 'chat',
    endpoints: [{ id: 'e1', label: 'a', url: 'https://a.com/v1' }],
    keys: []
  }
  assert.equal(getCXEndpointUrl(provider, 'missing'), 'https://a.com/v1')
})

test('getCXEndpointUrl returns empty string when provider has no endpoints', () => {
  const provider: CXProvider = {
    id: 'p1',
    name: 'p',
    enabled: true,
    wireApi: 'chat',
    endpoints: [],
    keys: []
  }
  assert.equal(getCXEndpointUrl(provider), '')
})

test('createEmptyLocalCXLandData returns v1 with empty arrays', () => {
  const data = createEmptyLocalCXLandData()
  assert.equal(data.version, 1)
  assert.deepEqual(data.providers, [])
  assert.deepEqual(data.configs, [])
})

test('getCXKey returns key when found', () => {
  const provider: CXProvider = {
    id: 'p1', name: 'p', enabled: true, wireApi: 'chat', endpoints: [],
    keys: [{ id: 'k1', label: 'main', token: 'enc:v1:abc' }]
  }
  const key = getCXKey(provider, 'k1')
  assert.notEqual(key, null)
  assert.equal(key!.label, 'main')
})

test('getCXKey returns null when key not found', () => {
  const provider: CXProvider = {
    id: 'p1', name: 'p', enabled: true, wireApi: 'chat', endpoints: [],
    keys: [{ id: 'k1', label: 'main', token: 'enc:v1:abc' }]
  }
  assert.equal(getCXKey(provider, 'missing'), null)
})

test('createEmptyCXKey returns key with uuid and empty fields', () => {
  const key = createEmptyCXKey()
  assert.ok(key.id)
  assert.equal(key.label, '')
  assert.equal(key.token, '')
  assert.equal(key.comment, '')
})
