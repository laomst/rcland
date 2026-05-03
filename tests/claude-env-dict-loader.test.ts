import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  loadClaudeEnvDictFileFrom,
  saveClaudeEnvDictFileTo
} from '../src/main/services/claude-env-dict-loader'
import { createEmptyClaudeEnvDictFile } from '../src/shared/types/claude-env-dict'

function withTempDir(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'rcland-env-dict-'))
  try { fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('returns empty file when missing', () => {
  withTempDir((dir) => {
    const filePath = join(dir, 'rcland.config.claude-env-dict.json')
    assert.deepEqual(loadClaudeEnvDictFileFrom(filePath), createEmptyClaudeEnvDictFile())
  })
})

test('returns empty when JSON is corrupt', () => {
  withTempDir((dir) => {
    const filePath = join(dir, 'rcland.config.claude-env-dict.json')
    writeFileSync(filePath, '{not json')
    assert.deepEqual(loadClaudeEnvDictFileFrom(filePath), createEmptyClaudeEnvDictFile())
  })
})

test('returns empty when version mismatch', () => {
  withTempDir((dir) => {
    const filePath = join(dir, 'rcland.config.claude-env-dict.json')
    writeFileSync(filePath, JSON.stringify({ version: 99, userItems: [], builtInOverrides: {} }))
    assert.deepEqual(loadClaudeEnvDictFileFrom(filePath), createEmptyClaudeEnvDictFile())
  })
})

test('roundtrips a valid file', () => {
  withTempDir((dir) => {
    const filePath = join(dir, 'rcland.config.claude-env-dict.json')
    const data = {
      version: 1 as const,
      userItems: [{
        key: 'MY_VAR',
        category: 'custom' as const,
        defaultInTemplate: false,
        exampleValue: 'foo',
        description: 'note'
      }],
      builtInOverrides: { ANTHROPIC_MODEL: { defaultInTemplate: false } }
    }
    saveClaudeEnvDictFileTo(filePath, data)
    const loaded = loadClaudeEnvDictFileFrom(filePath)
    assert.deepEqual(loaded, data)
    assert.ok(readFileSync(filePath, 'utf-8').includes('\n'))
  })
})

test('coerces missing fields to empty', () => {
  withTempDir((dir) => {
    const filePath = join(dir, 'rcland.config.claude-env-dict.json')
    writeFileSync(filePath, JSON.stringify({ version: 1 }))
    const loaded = loadClaudeEnvDictFileFrom(filePath)
    assert.deepEqual(loaded, createEmptyClaudeEnvDictFile())
  })
})
