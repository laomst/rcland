import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeLegacyLocalItems, stripLegacyLocalOnly } from '../src/main/services/legacy-migration'

test('stripLegacyLocalOnly 剥除 localOnly', () => {
  assert.deepEqual(stripLegacyLocalOnly({ id: 'a', localOnly: true }), { id: 'a' })
  assert.deepEqual(stripLegacyLocalOnly({ id: 'b' }), { id: 'b' })
})

test('mergeLegacyLocalItems: synced 全适用、local 打 machineId', () => {
  const synced = [{ id: 's1' }]
  const local = [{ id: 'l1', localOnly: true }]
  const result = mergeLegacyLocalItems(synced, local, 'm1')
  assert.deepEqual(result, [
    { id: 's1' },                                  // synced 不动（全适用）
    { id: 'l1', applicableMachines: ['m1'] }       // local 打机器 id、剥 localOnly
  ])
})

test('mergeLegacyLocalItems: 空 local 返回 synced 副本', () => {
  const synced = [{ id: 's1' }]
  const result = mergeLegacyLocalItems(synced, [], 'm1')
  assert.deepEqual(result, [{ id: 's1' }])
})

test('mergeLegacyLocalItems: 不修改入参', () => {
  const synced = [{ id: 's1' }]
  const local = [{ id: 'l1' }]
  mergeLegacyLocalItems(synced, local, 'm1')
  assert.equal(synced.length, 1)
  assert.equal(local.length, 1)
  assert.equal('applicableMachines' in local[0], false)
})
