import test from 'node:test'
import assert from 'node:assert/strict'
import { SystemProxyBashGenerator } from '../src/main/services/generators/sections/system-proxy/bash'
import { SystemProxyZshGenerator } from '../src/main/services/generators/sections/system-proxy/zsh'
import { SystemProxyPowerShellGenerator } from '../src/main/services/generators/sections/system-proxy/powershell'

const mockCtx = {
  proxyFunctionNames: { proxyOn: 'proxy-on', proxyOff: 'proxy-off', proxyStatus: 'proxy-status' }
} as any

test('zsh system proxy generator outputs _rcland_read_os_proxy function', () => {
  const gen = new SystemProxyZshGenerator()
  const output = gen.generate(undefined, mockCtx)
  assert.match(output, /_rcland_read_os_proxy\(\)/)
  assert.match(output, /proxy-on\(\)/)
  assert.match(output, /proxy-off\(\)/)
  assert.match(output, /proxy-status\(\)/)
  assert.match(output, /scutil --proxy/)
  assert.match(output, /gsettings/)
})

test('bash system proxy generator outputs same functions as zsh', () => {
  const zsh = new SystemProxyZshGenerator().generate(undefined, mockCtx)
  const bash = new SystemProxyBashGenerator().generate(undefined, mockCtx)
  assert.equal(zsh, bash)
})

test('powershell system proxy generator outputs _rcland_ReadOsProxy function', () => {
  const gen = new SystemProxyPowerShellGenerator()
  const output = gen.generate(undefined, mockCtx)
  assert.match(output, /_rcland_ReadOsProxy/)
  assert.match(output, /function proxy-on/)
  assert.match(output, /function proxy-off/)
  assert.match(output, /function proxy-status/)
  assert.match(output, /ProxyServer/)
})

test('generators use custom proxy function names', () => {
  const customCtx = {
    proxyFunctionNames: { proxyOn: 'my-proxy-on', proxyOff: 'my-proxy-off', proxyStatus: 'my-proxy-status' }
  } as any
  const gen = new SystemProxyZshGenerator()
  const output = gen.generate(undefined, customCtx)
  assert.match(output, /my-proxy-on\(\)/)
  assert.match(output, /my-proxy-off\(\)/)
  assert.match(output, /my-proxy-status\(\)/)
  assert.doesNotMatch(output, /^proxy-on\(\)/m)  // old bare name should not appear as a function definition
})
