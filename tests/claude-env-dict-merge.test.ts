import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeClaudeEnvDict } from '../src/shared/claude-env-dict-merge'
import type { ClaudeEnvDictItem, ClaudeEnvDictFile } from '../src/shared/types/claude-env-dict'

const builtIn: ClaudeEnvDictItem = {
  key: 'BUILT_A',
  category: 'model',
  builtIn: true,
  defaultInTemplate: true,
  description: { type: 'i18n', key: 'claudeEnvDict.desc.BUILT_A' }
}

test('returns built-ins as-is when file is empty', () => {
  const file: ClaudeEnvDictFile = { version: 1, userItems: [], builtInOverrides: {} }
  const merged = mergeClaudeEnvDict([builtIn], file)
  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0], builtIn)
})

test('applies builtInOverrides to defaultInTemplate', () => {
  const file: ClaudeEnvDictFile = {
    version: 1,
    userItems: [],
    builtInOverrides: { BUILT_A: { defaultInTemplate: false } }
  }
  const merged = mergeClaudeEnvDict([builtIn], file)
  assert.equal(merged[0].defaultInTemplate, false)
  assert.equal(merged[0].builtIn, true)
  assert.equal(merged[0].category, 'model')
})

test('appends user items after built-ins', () => {
  const file: ClaudeEnvDictFile = {
    version: 1,
    userItems: [{
      key: 'USER_A',
      category: 'custom',
      defaultInTemplate: false,
      exampleValue: 'foo',
      description: 'user description'
    }],
    builtInOverrides: {}
  }
  const merged = mergeClaudeEnvDict([builtIn], file)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].key, 'BUILT_A')
  assert.equal(merged[1].key, 'USER_A')
  assert.equal(merged[1].builtIn, false)
  assert.deepEqual(merged[1].description, { type: 'plain', text: 'user description' })
})

test('drops user items that conflict with built-in keys', () => {
  const file: ClaudeEnvDictFile = {
    version: 1,
    userItems: [{
      key: 'BUILT_A',
      category: 'custom',
      defaultInTemplate: true,
      description: 'should be dropped'
    }],
    builtInOverrides: {}
  }
  const merged = mergeClaudeEnvDict([builtIn], file)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].builtIn, true)
})

test('drops duplicate user items (last wins)', () => {
  const file: ClaudeEnvDictFile = {
    version: 1,
    userItems: [
      { key: 'USER_A', category: 'custom', defaultInTemplate: false, description: 'first' },
      { key: 'USER_A', category: 'custom', defaultInTemplate: true, description: 'second' }
    ],
    builtInOverrides: {}
  }
  const merged = mergeClaudeEnvDict([], file)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].defaultInTemplate, true)
  assert.deepEqual(merged[0].description, { type: 'plain', text: 'second' })
})
