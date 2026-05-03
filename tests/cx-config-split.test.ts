import test from 'node:test'
import assert from 'node:assert/strict'
import { splitLocalItems, markLocalItems } from '../src/main/services/local-sync'
import type { CXProvider, CXLaunchItem } from '../src/shared/types'

test('splitLocalItems separates localOnly CX providers from synced ones', () => {
  const providers: CXProvider[] = [
    { id: 'p1', name: 'p1', enabled: true, wireApi: 'chat', endpoints: [], keys: [] },
    { id: 'p2', name: 'p2', enabled: true, wireApi: 'chat', endpoints: [], keys: [], localOnly: true }
  ]
  const { synced, local } = splitLocalItems(providers)
  assert.equal(synced.length, 1)
  assert.equal(synced[0].id, 'p1')
  assert.equal(local.length, 1)
  assert.equal(local[0].id, 'p2')
  assert.equal((synced[0] as any).localOnly, undefined)
})

test('splitLocalItems separates localOnly CX configs from synced ones', () => {
  const configs: CXLaunchItem[] = [
    { id: 'c1', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'c1', funcName: 'cx-c1', enabled: true },
    { id: 'c2', providerId: 'p1', endpointId: 'e1', keyId: 'k1', name: 'c2', funcName: 'cx-c2', enabled: true, localOnly: true }
  ]
  const { synced, local } = splitLocalItems(configs)
  assert.equal(synced.length, 1)
  assert.equal(local.length, 1)
})

test('markLocalItems adds localOnly:true to all CX providers', () => {
  const providers: CXProvider[] = [
    { id: 'p1', name: 'p1', enabled: true, wireApi: 'chat', endpoints: [], keys: [] }
  ]
  const marked = markLocalItems(providers)
  assert.equal(marked[0].localOnly, true)
})
