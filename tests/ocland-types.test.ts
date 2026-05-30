import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyOCLandData,
  normalizeOCLandData,
  getOCEndpointUrl,
  getOCKey,
  sdkTypeToNpm,
  type OCLandData,
  type OCProvider
} from '../src/shared/types/oc-launch'

test('createEmptyOCLandData returns version 1 empty data', () => {
  const d = createEmptyOCLandData()
  assert.equal(d.version, 1)
  assert.deepEqual(d.providers, [])
  assert.deepEqual(d.launchItems, [])
  assert.equal(d.selector.funcName, 'oc')
})

test('normalizeOCLandData rejects wrong version', () => {
  assert.equal(normalizeOCLandData({ version: 99 }).version, 1)
  assert.equal(normalizeOCLandData(null).version, 1)
})

test('normalizeOCLandData passes valid data through', () => {
  const valid: OCLandData = createEmptyOCLandData()
  valid.providers.push({
    id: 'p1', name: 'GLM', enabled: true, sdkType: 'anthropic',
    endpoints: [{ id: 'e1', label: 'd', url: 'https://x/v1' }],
    keys: [{ id: 'k1', label: 'm', token: 'enc:v1:a' }],
    models: [{ id: 'glm-4.6', name: 'GLM-4.6' }]
  })
  assert.equal(normalizeOCLandData(valid).providers.length, 1)
})

test('sdkTypeToNpm maps sdkType to ai-sdk package', () => {
  assert.equal(sdkTypeToNpm('anthropic'), '@ai-sdk/anthropic')
  assert.equal(sdkTypeToNpm('openai-compatible'), '@ai-sdk/openai-compatible')
})

test('getOCEndpointUrl falls back to first endpoint', () => {
  const p: OCProvider = {
    id: 'p1', name: 'x', enabled: true, sdkType: 'anthropic',
    endpoints: [{ id: 'e1', label: 'a', url: 'https://first' }, { id: 'e2', label: 'b', url: 'https://second' }],
    keys: [], models: []
  }
  assert.equal(getOCEndpointUrl(p, 'e2'), 'https://second')
  assert.equal(getOCEndpointUrl(p, undefined), 'https://first')
})

test('getOCKey finds key by id', () => {
  const p: OCProvider = {
    id: 'p1', name: 'x', enabled: true, sdkType: 'anthropic',
    endpoints: [], keys: [{ id: 'k1', label: 'm', token: 't' }], models: []
  }
  assert.equal(getOCKey(p, 'k1')?.token, 't')
  assert.equal(getOCKey(p, 'nope'), null)
})
