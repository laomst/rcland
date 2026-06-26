import test from 'node:test'
import assert from 'node:assert/strict'
import { appliesToMachine, isMachineExclusive } from '../src/shared/machine-filter'

test('appliesToMachine: undefined/empty 全部适用', () => {
  assert.equal(appliesToMachine({}, 'm1'), true)
  assert.equal(appliesToMachine({ applicableMachines: [] }, 'm1'), true)
})

test('appliesToMachine: 含本机 id 适用', () => {
  assert.equal(appliesToMachine({ applicableMachines: ['m1', 'm2'] }, 'm1'), true)
})

test('appliesToMachine: 不含本机 id 不适用', () => {
  assert.equal(appliesToMachine({ applicableMachines: ['m2'] }, 'm1'), false)
})

test('isMachineExclusive: 仅含本机为 true', () => {
  assert.equal(isMachineExclusive({ applicableMachines: ['m1'] }, 'm1'), true)
})

test('isMachineExclusive: 空/全适用为 false', () => {
  assert.equal(isMachineExclusive({}, 'm1'), false)
  assert.equal(isMachineExclusive({ applicableMachines: [] }, 'm1'), false)
})

test('isMachineExclusive: 含其他机器为 false', () => {
  assert.equal(isMachineExclusive({ applicableMachines: ['m1', 'm2'] }, 'm1'), false)
})
