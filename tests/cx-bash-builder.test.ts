import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBashLikeCXContent } from '../src/main/services/generators/sections/cxland/bash-builder'
import type { CXLandData } from '../src/shared/types'
import type { SystemProxyConfig } from '../src/shared/system-proxy'

const systemProxy: SystemProxyConfig = {
  proxyEnvVars: [
    { type: 'http', value: 'http://127.0.0.1:7897' },
    { type: 'https', value: 'http://127.0.0.1:7897' }
  ]
}

function makeData(overrides: Partial<CXLandData> = {}): CXLandData {
  return {
    version: 3,
    providers: [{
      id: 'p1',
      name: 'GLM Proxy',
      enabled: true,
      wireApi: 'chat',
      endpoints: [{ id: 'e1', label: 'default', url: 'https://api.example.com/v1' }],
      keys: [{ id: 'k1', label: 'main', token: 'enc:v1:abc' }]
    }],
    configs: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k1',
      name: 'GLM5',
      funcName: 'cx-glm5',
      enabled: true,
      model: 'gpt-5.4'
    }],
    selector: { enabled: false, funcName: 'cx', promptTitle: '选择' },
    ...overrides
  }
}

test('buildBashLikeCXContent emits one function per enabled config with -c args', () => {
  const tokens = new Map([['cx-token:c1', 'plaintext-token']])
  const out = buildBashLikeCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /cx-glm5\(\) \{/)
  assert.match(out, /OPENAI_API_KEY='plaintext-token'/)
  assert.match(out, /-c 'model_providers\.ccland_cx_glm5\.name="GLM Proxy"'/)
  assert.match(out, /-c 'model_providers\.ccland_cx_glm5\.base_url="https:\/\/api\.example\.com\/v1"'/)
  assert.match(out, /-c 'model_providers\.ccland_cx_glm5\.env_key="OPENAI_API_KEY"'/)
  assert.match(out, /-c 'model_providers\.ccland_cx_glm5\.wire_api="chat"'/)
  assert.match(out, /-c 'model_provider="ccland_cx_glm5"'/)
  assert.match(out, /-c 'model="gpt-5\.4"'/)
})

test('buildBashLikeCXContent omits -c model when ConfigSet.model is empty', () => {
  const data = makeData()
  data.configs[0].model = undefined
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.doesNotMatch(out, /-c 'model="/)
  assert.match(out, /-c 'model_provider=/)
})

test('buildBashLikeCXContent emits error stub when token is empty', () => {
  const tokens = new Map([['cx-token:c1', '']])
  const out = buildBashLikeCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /cx-glm5\(\) \{ echo .+ 未设置 Token/)
})

test('buildBashLikeCXContent emits error stub when provider is missing', () => {
  const data = makeData()
  data.configs[0].providerId = 'unknown'
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.match(out, /cx-glm5\(\) \{ echo .+/)
})

test('buildBashLikeCXContent emits selector when enabled', () => {
  const data = makeData()
  data.selector = { enabled: true, funcName: 'cx', promptTitle: '选 codex' }
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.match(out, /^cx\(\) \{/m)
  assert.match(out, /'cx-glm5:GLM5'/)
  assert.match(out, /alias cxd='cx --dangerously-bypass-approvals-and-sandbox'/)
})

test('buildBashLikeCXContent unsets proxy vars when endpoint disables system proxy', () => {
  const data = makeData()
  data.providers[0].endpoints[0].useSystemProxy = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.match(out, /-u HTTP_PROXY/)
})

test('buildBashLikeCXContent injects proxy env when endpoint enables system proxy', () => {
  const data = makeData()
  data.providers[0].endpoints[0].useSystemProxy = true
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.match(out, /HTTP_PROXY='http:\/\/127\.0\.0\.1:7897'/)
})

test('buildBashLikeCXContent does NOT require -n session name', () => {
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(makeData(), tokens, systemProxy)
  assert.doesNotMatch(out, /必须使用 -n 指定会话名称/)
  assert.doesNotMatch(out, /set_main_task_name/)
})

test('buildBashLikeCXContent skips disabled configs', () => {
  const data = makeData()
  data.configs[0].enabled = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.doesNotMatch(out, /cx-glm5\(\)/)
})

test('buildBashLikeCXContent skips configs whose provider is disabled', () => {
  const data = makeData()
  data.providers[0].enabled = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildBashLikeCXContent(data, tokens, systemProxy)
  assert.doesNotMatch(out, /cx-glm5\(\) \{$/m)
})
