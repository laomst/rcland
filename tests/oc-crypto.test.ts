import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOCDecryptedMap } from '../src/main/services/crypto-utils'
import * as cryptoService from '../src/main/services/crypto'
import type { OCLandData } from '../src/shared/types'

const KEY = 'test-passphrase'

function encrypt(plain: string): string {
  return cryptoService.encrypt(plain, KEY)
}

test('buildOCDecryptedMap decrypts tokens for each OC launch item', () => {
  const data: OCLandData = {
    version: 2,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      sdkType: 'openai-compatible',
      endpoints: [{ id: 'e1', label: 'a', url: 'https://api.example.com/v1' }],
      keys: [{ id: 'k1', label: 'main', token: encrypt('oc-secret-token') }],
      models: []
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k1',
      name: 'OC GLM',
      funcName: 'oc-glm',
      enabled: true
    }],
    selector: { funcName: 'oc', promptTitle: '选择' }
  }
  const { map, decryptFailed } = buildOCDecryptedMap(data, KEY)
  assert.equal(decryptFailed, false)
  assert.equal(map.get('oc-token:c1'), 'oc-secret-token')
})

test('buildOCDecryptedMap returns empty token when keyId reference is missing', () => {
  const data: OCLandData = {
    version: 2,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      sdkType: 'openai-compatible',
      endpoints: [],
      keys: [],
      models: []
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k_missing',
      name: 'X',
      funcName: 'oc-x',
      enabled: true
    }],
    selector: { funcName: 'oc', promptTitle: 't' }
  }
  const { map, decryptFailed } = buildOCDecryptedMap(data, KEY)
  assert.equal(decryptFailed, false)
  assert.equal(map.get('oc-token:c1'), '')
})

test('buildOCDecryptedMap returns empty token for unencrypted (plain) token', () => {
  const data: OCLandData = {
    version: 2,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      sdkType: 'openai-compatible',
      endpoints: [],
      keys: [{ id: 'k1', label: 'main', token: 'plain-not-encrypted' }],
      models: []
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k1',
      name: 'X',
      funcName: 'oc-x',
      enabled: true
    }],
    selector: { funcName: 'oc', promptTitle: 't' }
  }
  const { map, decryptFailed } = buildOCDecryptedMap(data, KEY)
  assert.equal(decryptFailed, false)
  assert.equal(map.get('oc-token:c1'), '')
})
