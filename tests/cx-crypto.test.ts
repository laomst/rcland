import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCXDecryptedMap } from '../src/main/services/crypto-utils'
import * as cryptoService from '../src/main/services/crypto'
import type { CXLandData } from '../src/shared/types'

const KEY = 'test-passphrase'

function encrypt(plain: string): string {
  return cryptoService.encrypt(plain, KEY)
}

test('buildCXDecryptedMap decrypts tokens for each enabled CX config', () => {
  const data: CXLandData = {
    version: 3,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      wireApi: 'chat',
      endpoints: [{ id: 'e1', label: 'a', url: 'https://api.example.com/v1' }],
      keys: [{ id: 'k1', label: 'main', token: encrypt('secret-token') }]
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k1',
      name: 'GLM5',
      funcName: 'cx-glm5',
      enabled: true
    }],
    selector: { funcName: 'cx', promptTitle: '选择' }
  }
  const { map, decryptFailed } = buildCXDecryptedMap(data, KEY)
  assert.equal(decryptFailed, false)
  assert.equal(map.get('cx-token:c1'), 'secret-token')
})

test('buildCXDecryptedMap sets empty token and decryptFailed=true on bad key', () => {
  const data: CXLandData = {
    version: 3,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      wireApi: 'chat',
      endpoints: [],
      keys: [{ id: 'k1', label: 'main', token: encrypt('secret') }]
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k1',
      name: 'X',
      funcName: 'cx-x',
      enabled: true
    }],
    selector: { funcName: 'cx', promptTitle: 't' }
  }
  const { map, decryptFailed } = buildCXDecryptedMap(data, 'wrong-key')
  assert.equal(decryptFailed, true)
  assert.equal(map.get('cx-token:c1'), '')
})

test('buildCXDecryptedMap returns empty token when key reference is missing', () => {
  const data: CXLandData = {
    version: 3,
    providers: [{
      id: 'p1',
      name: 'p1',
      enabled: true,
      wireApi: 'chat',
      endpoints: [],
      keys: []
    }],
    launchItems: [{
      id: 'c1',
      providerId: 'p1',
      endpointId: 'e1',
      keyId: 'k_missing',
      name: 'X',
      funcName: 'cx-x',
      enabled: true
    }],
    selector: { funcName: 'cx', promptTitle: 't' }
  }
  const { map, decryptFailed } = buildCXDecryptedMap(data, KEY)
  assert.equal(decryptFailed, false)
  assert.equal(map.get('cx-token:c1'), '')
})
