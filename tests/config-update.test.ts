import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfigUpdatePatch } from '../src/renderer/src/modules/cc-launch/components/config-update'

test('config edit patch preserves provider and locality changes', () => {
  const patch = createConfigUpdatePatch({
    providerId: 'provider-new',
    endpointId: 'endpoint-new',
    keyId: 'key-new',
    name: 'New Provider Config',
    funcName: 'cc-new',
    envVars: {},
    localOnly: true
  })

  assert.deepEqual(patch, {
    providerId: 'provider-new',
    endpointId: 'endpoint-new',
    keyId: 'key-new',
    name: 'New Provider Config',
    funcName: 'cc-new',
    envVars: {},
    localOnly: true
  })
})

test('config edit patch includes passthrough fields only when defined', () => {
  const patch = createConfigUpdatePatch({
    providerId: '',
    endpointId: '',
    keyId: '',
    name: 'Passthrough',
    funcName: 'cc-pass',
    envVars: {},
    passthrough: true,
    useSystemProxy: false
  })

  assert.equal(patch.passthrough, true)
  assert.equal(patch.useSystemProxy, false)
})
