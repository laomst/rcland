import test from 'node:test'
import assert from 'node:assert/strict'
import { markLocalItems, splitLocalItems } from '../src/main/services/local-sync'

test('markLocalItems sets localOnly true without mutating input', () => {
  const input = [{ id: 'a' }]
  const result = markLocalItems(input)
  assert.deepEqual(result, [{ id: 'a', localOnly: true }])
  assert.deepEqual(input, [{ id: 'a' }])
})

test('splitLocalItems separates and strips localOnly from synced items', () => {
  const result = splitLocalItems([{ id: 'sync', localOnly: false }, { id: 'local', localOnly: true }])
  assert.deepEqual(result.synced, [{ id: 'sync' }])
  assert.deepEqual(result.local, [{ id: 'local', localOnly: true }])
})
