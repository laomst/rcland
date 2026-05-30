import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOCConfigContent, ocKeyEnvVarName, buildOCConfigFiles } from '../src/main/services/generators/oc-config'
import type { OCLandData, OCProvider, OCLaunchItem } from '../src/shared/types/oc-launch'

function provider(over: Partial<OCProvider> = {}): OCProvider {
  return {
    id: 'p1', name: 'GLM Proxy', enabled: true, sdkType: 'anthropic',
    endpoints: [{ id: 'e1', label: 'd', url: 'https://api.z.ai/api/anthropic' }],
    keys: [{ id: 'k1', label: 'm', token: 'enc:v1:abc' }],
    models: [{ id: 'glm-4.6', name: 'GLM-4.6', contextLimit: 200000, outputLimit: 65536 }],
    ...over
  }
}
function item(over: Partial<OCLaunchItem> = {}): OCLaunchItem {
  return { id: 'item-1', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'GLM', funcName: 'oc-glm', enabled: true, modelId: 'glm-4.6', ...over }
}

test('ocKeyEnvVarName sanitizes hyphens to underscores', () => {
  assert.equal(ocKeyEnvVarName('a1b2-c3d4'), 'RCLAND_OC_a1b2_c3d4_KEY')
})

test('buildOCConfigContent produces provider block with env-ref apiKey', () => {
  const json = JSON.parse(buildOCConfigContent(provider(), item()))
  assert.equal(json.provider.p1.npm, '@ai-sdk/anthropic')
  assert.equal(json.provider.p1.name, 'GLM Proxy')
  assert.equal(json.provider.p1.options.baseURL, 'https://api.z.ai/api/anthropic')
  assert.equal(json.provider.p1.options.apiKey, '{env:RCLAND_OC_item_1_KEY}')
})

test('buildOCConfigContent never writes plaintext token', () => {
  const content = buildOCConfigContent(provider(), item())
  assert.ok(!content.includes('enc:v1:'))
})

test('buildOCConfigContent writes models with limit', () => {
  const json = JSON.parse(buildOCConfigContent(provider(), item()))
  assert.deepEqual(json.provider.p1.models['glm-4.6'], { name: 'GLM-4.6', limit: { context: 200000, output: 65536 } })
})

test('buildOCConfigContent omits limit when not provided', () => {
  const p = provider({ models: [{ id: 'm1', name: 'M1' }] })
  const json = JSON.parse(buildOCConfigContent(p, item({ modelId: 'm1' })))
  assert.deepEqual(json.provider.p1.models.m1, { name: 'M1' })
})

test('buildOCConfigContent sdkType openai-compatible maps npm', () => {
  const json = JSON.parse(buildOCConfigContent(provider({ sdkType: 'openai-compatible' }), item()))
  assert.equal(json.provider.p1.npm, '@ai-sdk/openai-compatible')
})

test('buildOCConfigFiles emits one file per enabled non-passthrough item', () => {
  const data: OCLandData = {
    version: 1, providers: [provider()],
    launchItems: [item(), item({ id: 'item-2', funcName: 'oc-x', enabled: false }), item({ id: 'item-3', funcName: 'oc-pt', passthrough: true })],
    selector: { funcName: 'oc', promptTitle: 't' }
  }
  const files = buildOCConfigFiles(data)
  assert.equal(files.length, 1)
  assert.ok(files[0].filePath.endsWith('item-1.json'))
})

test('buildOCConfigFiles skips items with disabled or missing provider', () => {
  const data: OCLandData = {
    version: 1,
    providers: [provider({ enabled: false })],
    launchItems: [item(), item({ id: 'orphan', providerId: 'nope', funcName: 'oc-orphan' })],
    selector: { funcName: 'oc', promptTitle: 't' }
  }
  assert.equal(buildOCConfigFiles(data).length, 0)
})

test('buildOCConfigFiles skips items whose endpoint resolves to empty baseURL', () => {
  const data: OCLandData = {
    version: 1,
    providers: [provider({ endpoints: [] })],
    launchItems: [item()],
    selector: { funcName: 'oc', promptTitle: 't' }
  }
  assert.equal(buildOCConfigFiles(data).length, 0)
})

test('buildOCConfigContent emits empty models object when provider has no models', () => {
  const json = JSON.parse(buildOCConfigContent(provider({ models: [] }), item({ modelId: undefined })))
  assert.deepEqual(json.provider.p1.models, {})
})

test('ocKeyEnvVarName rejects unsafe ids', () => {
  assert.throws(() => ocKeyEnvVarName('../evil'))
  assert.throws(() => ocKeyEnvVarName('a b'))
})
