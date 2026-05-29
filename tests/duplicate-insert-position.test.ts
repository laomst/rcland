import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('path variable copy inserts immediately after the copied item', () => {
  const source = readFileSync('src/renderer/src/modules/shell-path/components/PathVariableCard.tsx', 'utf8')

  assert.match(source, /addPathVariableAfter\(variable\.id,/)
})

test('CX launch item copy inserts immediately after the copied item', () => {
  const source = readFileSync('src/renderer/src/modules/cx-launch/components/LaunchItemCard.tsx', 'utf8')

  assert.match(source, /addLaunchItemAfter\(launchItem\.id,/)
})
