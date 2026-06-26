import test from 'node:test'
import assert from 'node:assert/strict'
import { upsertMachine } from '../src/main/services/machines-config'
import { createEmptyMachinesData } from '../src/shared/types/machine'

test('upsertMachine: 新机器追加，name=hostname', () => {
  const data = createEmptyMachinesData()
  const result = upsertMachine(data, { id: 'm1', os: 'darwin', hostname: 'MyMac', now: 1000 })
  assert.equal(result.machines.length, 1)
  assert.deepEqual(result.machines[0], {
    id: 'm1', name: 'MyMac', os: 'darwin', hostname: 'MyMac', createdAt: 1000, lastSeenAt: 1000
  })
})

test('upsertMachine: 已有机器仅更新 lastSeenAt/os/hostname，保留 name 和 createdAt', () => {
  const data = { version: 1 as const, machines: [
    { id: 'm1', name: '我的改名', os: 'darwin' as const, hostname: 'OldHost', createdAt: 500, lastSeenAt: 600 }
  ]}
  const result = upsertMachine(data, { id: 'm1', os: 'linux', hostname: 'NewHost', now: 2000 })
  assert.equal(result.machines.length, 1)
  assert.equal(result.machines[0].name, '我的改名')       // 保留
  assert.equal(result.machines[0].createdAt, 500)          // 保留
  assert.equal(result.machines[0].lastSeenAt, 2000)        // 更新
  assert.equal(result.machines[0].os, 'linux')             // 刷新
  assert.equal(result.machines[0].hostname, 'NewHost')     // 刷新
})

test('upsertMachine: 不修改入参', () => {
  const data = createEmptyMachinesData()
  upsertMachine(data, { id: 'm1', os: 'darwin', hostname: 'X', now: 1 })
  assert.equal(data.machines.length, 0)
})
