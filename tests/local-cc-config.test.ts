import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLocalCCConfigFrom } from '../src/main/services/local-cc-config-loader'

const EMPTY = { version: 1, providers: [], launchItems: [] }

function withTempFile(contents: string | null, fn: (filePath: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'rcland-cc-local-'))
  const filePath = join(dir, 'rcland.config.claudecode.local.json')
  if (contents !== null) writeFileSync(filePath, contents)
  try {
    fn(filePath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('returns empty data when file is missing', () => {
  withTempFile(null, (filePath) => {
    assert.deepEqual(loadLocalCCConfigFrom(filePath), EMPTY)
  })
})

test('returns empty data when JSON is corrupt', () => {
  withTempFile('{not json', (filePath) => {
    assert.deepEqual(loadLocalCCConfigFrom(filePath), EMPTY)
  })
})

test('returns empty data when version is wrong', () => {
  withTempFile(JSON.stringify({ version: 99, providers: [], launchItems: [] }), (filePath) => {
    assert.deepEqual(loadLocalCCConfigFrom(filePath), EMPTY)
  })
})

test('returns empty data when providers is not an array', () => {
  withTempFile(JSON.stringify({ version: 1, providers: 'oops', launchItems: [] }), (filePath) => {
    assert.deepEqual(loadLocalCCConfigFrom(filePath), EMPTY)
  })
})

test('returns parsed data when file is valid', () => {
  const valid = {
    version: 1,
    providers: [{ id: 'p1', name: 'X', enabled: true, endpoints: [], keys: [] }],
    launchItems: []
  }
  withTempFile(JSON.stringify(valid), (filePath) => {
    assert.deepEqual(loadLocalCCConfigFrom(filePath), valid)
  })
})
