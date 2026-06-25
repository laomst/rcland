import test from 'node:test'
import assert from 'node:assert/strict'
import { assertCCLaunchData, assertCXLandData, assertShellConfigData } from '../src/shared/ipc-contracts'

test('assertCCLaunchData rejects incomplete data', () => {
  assert.throws(() => assertCCLaunchData({ version: 6, providers: [] }), /launchItems/)
})

test('assertShellConfigData rejects incomplete data', () => {
  assert.throws(() => assertShellConfigData({ version: 1, variables: [] }), /pathVariables/)
})

test('assertCXLandData accepts v4 data', () => {
  assert.doesNotThrow(() => assertCXLandData({
    version: 4,
    providers: [],
    launchItems: [],
    selector: { funcName: 'cx', promptTitle: '选择' }
  }))
})

test('assertCXLandData rejects version 2', () => {
  assert.throws(() => assertCXLandData({
    version: 2,
    providers: []
  }), /version must be 4/)
})

test('assertCXLandData rejects missing launchItems array', () => {
  assert.throws(() => assertCXLandData({
    version: 4,
    providers: [],
    selector: {}
  }), /launchItems/)
})

test('assertCXLandData rejects missing selector', () => {
  assert.throws(() => assertCXLandData({
    version: 4,
    providers: [],
    launchItems: []
  }), /selector/)
})
