import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripCommonValues } from '@shared/types/cc-launch'
import type { Provider } from '@shared/types'
import { deriveCommonValuesMap } from '@renderer/modules/cc-launch/components/launch-item-update'

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

function makeProvider(envVars: Provider['template']['envVars']): Provider {
  return {
    id: 'p1',
    name: 'P',
    enabled: true,
    endpoints: [],
    keys: [],
    template: { envVars }
  }
}

test('deriveCommonValuesMap returns empty map for undefined provider', () => {
  assert.deepEqual(deriveCommonValuesMap(undefined), {})
})

test('deriveCommonValuesMap returns empty map when no envVars have commonValues', () => {
  const p = makeProvider({
    FOO: { value: '', enabled: true }
  })
  assert.deepEqual(deriveCommonValuesMap(p), {})
})

test('deriveCommonValuesMap includes only keys that have non-empty commonValues', () => {
  const p = makeProvider({
    FOO: { value: '', enabled: true, commonValues: ['a', 'b'] },
    BAR: { value: '', enabled: true, commonValues: [] },
    BAZ: { value: '', enabled: true }
  })
  assert.deepEqual(deriveCommonValuesMap(p), { FOO: ['a', 'b'] })
})
