import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripCommonValues } from '@shared/types/cc-launch'

test('stripCommonValues removes commonValues from all entries', () => {
  const input = {
    FOO: { value: 'a', enabled: true, commonValues: ['a', 'b'] },
    BAR: { value: '', enabled: false }
  }
  const result = stripCommonValues(input)
  assert.deepEqual(result, {
    FOO: { value: 'a', enabled: true },
    BAR: { value: '', enabled: false }
  })
})

test('stripCommonValues returns empty map for empty input', () => {
  assert.deepEqual(stripCommonValues({}), {})
})
