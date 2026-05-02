import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBashLikeCXContent } from '../src/main/services/generators/sections/cxland/bash-builder'
import type { CXLandData } from '../src/shared/types'

const proxyFns = {
  proxyOn: 'proxy-on',
  proxyOff: 'proxy-off',
  proxyStatus: 'proxy-status'
}

function build(data: CXLandData, tokens: Map<string, string>): string {
  return buildBashLikeCXContent(data, tokens, proxyFns)
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
    selector: { funcName: 'cx', promptTitle: '选择' },
    ...overrides
  }
}

test('buildBashLikeCXContent emits one function per enabled config with -c args', () => {
  const tokens = new Map([['cx-token:c1', 'plaintext-token']])
  const out = build(makeData(), tokens)
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
  const out = build(data, tokens)
  assert.doesNotMatch(out, /-c 'model="/)
  assert.match(out, /-c 'model_provider=/)
})

test('buildBashLikeCXContent emits error stub when token is empty', () => {
  const tokens = new Map([['cx-token:c1', '']])
  const out = build(makeData(), tokens)
  assert.match(out, /cx-glm5\(\) \{ echo .+ 未设置 Token/)
})

test('buildBashLikeCXContent emits error stub when provider is missing', () => {
  const data = makeData()
  data.configs[0].providerId = 'unknown'
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.match(out, /cx-glm5\(\) \{ echo .+/)
})

test('buildBashLikeCXContent emits selector when enabled', () => {
  const data = makeData()
  data.selector = { funcName: 'cx', promptTitle: '选 codex' }
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.match(out, /^cx\(\) \{/m)
  assert.match(out, /'cx-glm5:GLM5'/)
  assert.match(out, /alias cxd='cx --dangerously-bypass-approvals-and-sandbox'/)
})

test('buildBashLikeCXContent selector enforces -n with OSC title', () => {
  const data = makeData()
  data.selector = { funcName: 'cx', promptTitle: '选择' }
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  // Selector requires -n
  assert.match(out, /if \[\[ -z "\$_session_name" \]\]; then/)
  assert.match(out, /printf '\\033\[31m错误: 必须使用 -n 指定会话名称/)
  // Selector sets OSC title
  assert.match(out, /printf '\\033\]0;%s\\007' "CX 🔸 \$_safe_session_name"/)
  // Selector passes remaining args (not -n) to child
  assert.match(out, /cx-glm5\)  cx-glm5 "\$\{_remaining\[@\]\}"/)
})

test('buildBashLikeCXContent calls configured proxy-off when endpoint disables system proxy', () => {
  const data = makeData()
  data.providers[0].endpoints[0].useSystemProxy = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.match(out, /proxy-off/)
})

test('buildBashLikeCXContent calls configured proxy-on when endpoint enables system proxy', () => {
  const data = makeData()
  data.providers[0].endpoints[0].useSystemProxy = true
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.match(out, /proxy-on \|\| return 1/)
})

test('buildBashLikeCXContent parses -n for OSC title and strips from args', () => {
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(makeData(), tokens)
  // Individual function should parse -n and set OSC title
  assert.match(out, /local _sn=""/)
  assert.match(out, /local _filtered=/)
  assert.match(out, /local _safe_sn="\$\(printf '%s' "\$_sn" \| LC_ALL=C tr -d '\\000-\\037\\177'\)"/)
  assert.match(out, /printf '\\033\]0;%s\\007' "CX 🔸 \$_safe_sn"/)
  // Should NOT pass -n to codex
  assert.match(out, /"\$\{_filtered\[@\]\}"/)
})

test('buildBashLikeCXContent skips disabled configs', () => {
  const data = makeData()
  data.configs[0].enabled = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.doesNotMatch(out, /cx-glm5\(\)/)
})

test('buildBashLikeCXContent skips configs whose provider is disabled', () => {
  const data = makeData()
  data.providers[0].enabled = false
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  assert.doesNotMatch(out, /cx-glm5\(\) \{$/m)
})

test('buildBashLikeCXContent selector makes -n optional when requireSessionName is false', () => {
  const data = makeData()
  data.selector = { funcName: 'cx', promptTitle: '选择', requireSessionName: false }
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = build(data, tokens)
  // Should NOT enforce -n (no error message about missing -n)
  assert.doesNotMatch(out, /错误: 必须使用 -n 指定会话名称/)
  // Should still validate a present -n has a value
  assert.match(out, /      -n\)\n        if \[\[ \$# -lt 2 \|\| -z "\$2" \]\]; then\n          printf '\\033\[31m错误: -n 需要提供会话名称/)
  // Should still have OSC title conditionally
  assert.match(out, /if \[\[ -n "\$_session_name" \]\]; then/)
  assert.match(out, /local _safe_session_name="\$\(printf '%s' "\$_session_name" \| LC_ALL=C tr -d '\\000-\\037\\177'\)"/)
  assert.match(out, /printf '\\033\]0;%s\\007' "CX 🔸 \$_safe_session_name"/)
})
