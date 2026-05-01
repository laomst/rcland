import test from 'node:test'
import assert from 'node:assert/strict'
import { SystemProxyZshGenerator } from '../src/main/services/generators/sections/system-proxy/zsh'
import { SystemProxyBashGenerator } from '../src/main/services/generators/sections/system-proxy/bash'
import { SystemProxyPowerShellGenerator } from '../src/main/services/generators/sections/system-proxy/powershell'
import { createGenerateContext } from '../src/main/services/generators/context'
import {
  parseSystemProxyExportScript,
  type SystemProxyConfig
} from '../src/shared/system-proxy'

const data: SystemProxyConfig = {
  proxyEnvVars: [
    { type: 'http', value: 'http://127.0.0.1:7897' },
    { type: 'https', value: 'http://127.0.0.1:7897' },
    { type: 'all', value: 'socks5://127.0.0.1:7897' },
    { type: 'no', value: '' }
  ]
}

test('system proxy parser imports Clash Verge export assignments', () => {
  assert.deepEqual(
    parseSystemProxyExportScript('export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 all_proxy=socks5://127.0.0.1:7897'),
    [
      { type: 'https', value: 'http://127.0.0.1:7897' },
      { type: 'http', value: 'http://127.0.0.1:7897' },
      { type: 'all', value: 'socks5://127.0.0.1:7897' }
    ]
  )
})

test('zsh system proxy generator exports configured values and unsets all proxy keys', () => {
  const output = new SystemProxyZshGenerator().generate(data, createGenerateContext('zsh', 'unused'))

  assert.match(output, /proxy-on\(\) \{/)
  assert.match(output, /export http_proxy='http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /export HTTP_PROXY='http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /export https_proxy='http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /export HTTPS_PROXY='http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /export all_proxy='socks5:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /export ALL_PROXY='socks5:\/\/127\.0\.0\.1:7897'/)
  assert.doesNotMatch(output, /export no_proxy=/)
  assert.match(output, /proxy-off\(\) \{/)
  assert.match(output, /unset http_proxy HTTP_PROXY https_proxy HTTPS_PROXY all_proxy ALL_PROXY no_proxy NO_PROXY/)
  assert.match(output, /proxy-status\(\) \{/)
  assert.match(output, /printf '%-12s %s\\n' 'http_proxy' "\$\{http_proxy:-\(empty\)\}"/)
})

test('bash system proxy generator matches zsh function names', () => {
  const output = new SystemProxyBashGenerator().generate(data, createGenerateContext('bash', 'unused'))

  assert.match(output, /proxy-on\(\) \{/)
  assert.match(output, /proxy-off\(\) \{/)
  assert.match(output, /proxy-status\(\) \{/)
})

test('powershell system proxy generator sets and clears process env vars', () => {
  const output = new SystemProxyPowerShellGenerator().generate(data, createGenerateContext('powershell', 'unused'))

  assert.match(output, /function proxy-on \{/)
  assert.match(output, /\$env:http_proxy = 'http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /\$env:HTTP_PROXY = 'http:\/\/127\.0\.0\.1:7897'/)
  assert.match(output, /function proxy-off \{/)
  assert.match(output, /Remove-Item "Env:http_proxy" -ErrorAction SilentlyContinue/)
  assert.match(output, /function proxy-status \{/)
  assert.match(output, /Write-Host \("http_proxy\s+: " \+ \$value\)/)
})
