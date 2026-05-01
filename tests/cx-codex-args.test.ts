import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeCodexProviderId,
  buildBashCodexConfigArg,
  buildPowerShellCodexConfigArg,
  escapeTomlString
} from '../src/main/services/generators/sections/cxland/codex-args'

test('sanitizeCodexProviderId replaces hyphens with underscores', () => {
  assert.equal(sanitizeCodexProviderId('cx-glm5'), 'ccland_cx_glm5')
})

test('sanitizeCodexProviderId replaces all non-alphanumeric chars', () => {
  assert.equal(sanitizeCodexProviderId('cx@my.provider'), 'ccland_cx_my_provider')
})

test('sanitizeCodexProviderId preserves underscores', () => {
  assert.equal(sanitizeCodexProviderId('cx_my_provider'), 'ccland_cx_my_provider')
})

test('escapeTomlString escapes backslash and double quote', () => {
  assert.equal(escapeTomlString('foo"bar'), 'foo\\"bar')
  assert.equal(escapeTomlString('a\\b'), 'a\\\\b')
  assert.equal(escapeTomlString('a\\"b'), 'a\\\\\\"b')
})

test('escapeTomlString leaves normal URLs unchanged', () => {
  assert.equal(escapeTomlString('https://api.example.com/v1'), 'https://api.example.com/v1')
})

test('buildBashCodexConfigArg wraps with single quotes around key="value"', () => {
  assert.equal(
    buildBashCodexConfigArg('model_provider', 'ccland_cx_glm5'),
    `'model_provider="ccland_cx_glm5"'`
  )
})

test('buildBashCodexConfigArg handles URL with colon and slash', () => {
  assert.equal(
    buildBashCodexConfigArg('model_providers.x.base_url', 'https://api.example.com/v1'),
    `'model_providers.x.base_url="https://api.example.com/v1"'`
  )
})

test('buildBashCodexConfigArg escapes embedded double quotes', () => {
  assert.equal(
    buildBashCodexConfigArg('x', 'a"b'),
    `'x="a\\"b"'`
  )
})

test('buildPowerShellCodexConfigArg uses single-quoted PS string with internal double quotes', () => {
  assert.equal(
    buildPowerShellCodexConfigArg('model_provider', 'ccland_cx_glm5'),
    `'model_provider="ccland_cx_glm5"'`
  )
})

test('buildPowerShellCodexConfigArg escapes single quotes by doubling them', () => {
  assert.equal(
    buildPowerShellCodexConfigArg('x', "a'b"),
    `'x="a''b"'`
  )
})
