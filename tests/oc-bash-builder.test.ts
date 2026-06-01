import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBashLikeOCContent } from '../src/main/services/generators/sections/ocland/bash-builder'
import type { OCLandData } from '../src/shared/types'

const proxyFns = { proxyOn: 'proxy-on', proxyOff: 'proxy-off', proxyStatus: 'proxy-status' }

function makeData(over: Partial<OCLandData> = {}): OCLandData {
  return {
    version: 1,
    providers: [{
      id: 'p1', name: 'GLM', enabled: true, sdkType: 'anthropic',
      endpoints: [{ id: 'e1', label: 'd', url: 'https://api.z.ai' }],
      keys: [{ id: 'k1', label: 'm', token: 'enc:v1:abc' }],
      models: [{ id: 'glm-4.6', name: 'GLM-4.6' }]
    }],
    launchItems: [{
      id: 'item-1', providerId: 'p1', endpointId: 'e1', keyId: 'k1',
      name: 'GLM', funcName: 'oc-glm', enabled: true, modelId: 'glm-4.6'
    }],
    selector: { funcName: 'oc', promptTitle: '选择 opencode 供应商' },
    ...over
  }
}

function build(data: OCLandData, tokens: Map<string, string>): string {
  return buildBashLikeOCContent(data, tokens, proxyFns)
}

test('emits function exporting key env, OPENCODE_CONFIG and -m', () => {
  const out = build(makeData(), new Map([['oc-token:item-1', 'plain-token']]))
  assert.match(out, /oc-glm\(\) \{/)
  assert.match(out, /export RCLAND_OC_item_1_KEY=/)
  assert.match(out, /plain-token/)
  assert.match(out, /export OPENCODE_CONFIG=.*\.rcland\/opencode\/item-1\.json/)
  assert.match(out, /opencode -m 'p1\/glm-4\.6' "\$\{?@\}?"/)
})

test('omits -m when modelId unset', () => {
  const data = makeData()
  data.launchItems[0].modelId = undefined
  const out = build(data, new Map([['oc-token:item-1', 't']]))
  assert.match(out, /opencode "\$\{?@\}?"/)
  assert.ok(!/-m /.test(out))
})

test('uses proxy-on when endpoint.useSystemProxy', () => {
  const data = makeData()
  data.providers[0].endpoints[0].useSystemProxy = true
  const out = build(data, new Map([['oc-token:item-1', 't']]))
  assert.match(out, /proxy-on \|\| return 1/)
})

test('passthrough item runs opencode directly without config', () => {
  const data = makeData()
  data.launchItems[0] = { id: 'item-1', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'PT', funcName: 'oc-pt', enabled: true, passthrough: true }
  const out = build(data, new Map())
  assert.match(out, /oc-pt\(\) \{/)
  assert.ok(!out.includes('OPENCODE_CONFIG'))
  assert.match(out, /opencode "\$@"/)
})

test('missing token produces error stub', () => {
  const out = build(makeData(), new Map([['oc-token:item-1', '']]))
  assert.match(out, /oc-glm\(\) \{ echo .*未设置 Token/)
})

test('generates selector function over enabled items', () => {
  const out = build(makeData(), new Map([['oc-token:item-1', 't']]))
  assert.match(out, /^oc\(\) \{/m)
  assert.match(out, /prompt-select/)
})

test('modelId with shell metacharacters is quoted (no injection)', () => {
  const data = makeData()
  data.launchItems[0].modelId = 'glm; rm -rf ~'
  const out = build(data, new Map([['oc-token:item-1', 't']]))
  // The dangerous value must be inside a quoted literal, not a bare token
  assert.ok(!/-m p1\/glm; rm/.test(out), 'must not emit unquoted injection')
  assert.match(out, /opencode -m '.*rm -rf.*'/)
})

test('missing provider produces error stub', () => {
  const data = makeData()
  data.launchItems[0].providerId = 'nonexistent'
  const out = build(data, new Map([['oc-token:item-1', 't']]))
  assert.match(out, /oc-glm\(\) \{ echo .*Provider 不存在/)
})

test('no selector generated when no enabled items', () => {
  const data = makeData({ launchItems: [] })
  const out = build(data, new Map())
  assert.ok(!/^oc\(\) \{/m.test(out))
})
