import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPowerShellOCContent } from '../src/main/services/generators/sections/ocland/powershell-builder'
import type { OCLandData } from '../src/shared/types'

function makeData(over: Partial<OCLandData> = {}): OCLandData {
  return {
    version: 1,
    providers: [{
      id: 'p1', name: 'GLM', enabled: true, sdkType: 'anthropic',
      endpoints: [{ id: 'e1', label: 'd', url: 'https://api.z.ai' }],
      keys: [{ id: 'k1', label: 'm', token: 'enc:v1:abc' }],
      models: [{ id: 'glm-4.6', name: 'GLM-4.6' }]
    }],
    launchItems: [{ id: 'item-1', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'GLM', funcName: 'oc-glm', enabled: true, modelId: 'glm-4.6' }],
    selector: { funcName: 'oc', promptTitle: 't' },
    ...over
  }
}

test('emits powershell function with env save/restore and -m', () => {
  const out = buildPowerShellOCContent(makeData(), new Map([['oc-token:item-1', 'plain-token']]))
  assert.match(out, /function oc-glm \{/)
  assert.match(out, /\$env:RCLAND_OC_item_1_KEY = 'plain-token'/)
  assert.match(out, /\$env:OPENCODE_CONFIG = /)
  assert.match(out, /opencode -m 'p1\/glm-4\.6' @args/)
  assert.match(out, /try \{/)
  assert.match(out, /finally \{/)
})

test('modelId with metacharacters is quoted (no injection)', () => {
  const data = makeData()
  data.launchItems[0].modelId = "x'; rm -rf ~"
  const out = buildPowerShellOCContent(data, new Map([['oc-token:item-1', 't']]))
  // single quotes doubled by quotePowerShellLiteral; dangerous value stays inside the literal
  assert.match(out, /opencode -m 'p1\/x''; rm -rf ~' @args/)
})

test('passthrough runs command without OPENCODE_CONFIG', () => {
  const data = makeData()
  data.launchItems[0] = { id: 'item-1', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'PT', funcName: 'oc-pt', enabled: true, passthrough: true }
  const out = buildPowerShellOCContent(data, new Map())
  assert.match(out, /function oc-pt \{/)
  assert.ok(!out.includes('OPENCODE_CONFIG'))
})
