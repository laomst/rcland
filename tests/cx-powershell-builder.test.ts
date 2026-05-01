import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPowerShellCXContent } from '../src/main/services/generators/sections/cxland/powershell-builder'
import type { CXLandData } from '../src/shared/types'
import type { SystemProxyConfig } from '../src/shared/system-proxy'

const systemProxy: SystemProxyConfig = {
  proxyEnvVars: [
    { type: 'http', value: 'http://127.0.0.1:7897' }
  ]
}

function makeData(): CXLandData {
  return {
    version: 3,
    providers: [{
      id: 'p1',
      name: 'GLM',
      enabled: true,
      wireApi: 'chat',
      endpoints: [{ id: 'e1', label: 'd', url: 'https://api.example.com/v1', useSystemProxy: false }],
      keys: [{ id: 'k1', label: 'm', token: 'enc:v1:abc' }]
    }],
    configs: [{
      id: 'c1', providerId: 'p1', endpointId: 'e1', keyId: 'k1',
      name: 'GLM5', funcName: 'cx-glm5', enabled: true
    }],
    selector: { enabled: true, funcName: 'cx', promptTitle: '选择' }
  }
}

test('buildPowerShellCXContent emits function with try/finally for OPENAI_API_KEY', () => {
  const tokens = new Map([['cx-token:c1', 'plaintext']])
  const out = buildPowerShellCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /function cx-glm5 \{/)
  assert.match(out, /\$env:OPENAI_API_KEY = 'plaintext'/)
  assert.match(out, /try \{/)
  assert.match(out, /finally \{/)
  assert.match(out, /Remove-Item Env:OPENAI_API_KEY/)
})

test('buildPowerShellCXContent emits selector function with switch dispatch', () => {
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildPowerShellCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /function cx \{/)
  assert.match(out, /'cx-glm5:GLM5'/)
  assert.match(out, /Set-Alias cxd/)
})

test('buildPowerShellCXContent emits error function when token is empty', () => {
  const tokens = new Map([['cx-token:c1', '']])
  const out = buildPowerShellCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /function cx-glm5 \{ Write-Error/)
})

test('buildPowerShellCXContent uses backtick line continuation for codex -c args', () => {
  const tokens = new Map([['cx-token:c1', 'tok']])
  const out = buildPowerShellCXContent(makeData(), tokens, systemProxy)
  assert.match(out, /codex `/)
  assert.match(out, /-c 'model_providers\.ccland_cx_glm5\.base_url="https:\/\/api\.example\.com\/v1"'/)
  assert.match(out, /@args/)
})
