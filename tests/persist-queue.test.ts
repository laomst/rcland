import test from 'node:test'
import assert from 'node:assert/strict'
import { createPersistQueue } from '../src/renderer/src/stores/persist'

test('persist queue runs saves in order', async () => {
  const calls: string[] = []
  const queue = createPersistQueue()

  await Promise.all([
    queue.enqueue(async () => { calls.push('first') }),
    queue.enqueue(async () => { calls.push('second') }),
    queue.enqueue(async () => { calls.push('third') })
  ])

  assert.deepEqual(calls, ['first', 'second', 'third'])
})

test('persist queue records latest error', async () => {
  const queue = createPersistQueue()
  await assert.rejects(() => queue.enqueue(async () => { throw new Error('disk failed') }), /disk failed/)
  assert.equal(queue.getLastError()?.message, 'disk failed')
})
