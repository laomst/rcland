import test from 'node:test'
import assert from 'node:assert/strict'
import { generateConfigWithKey } from '../src/main/services/shell-apply'
import { createEmptyCXLandData, type CCLaunchData } from '../src/shared/types'

import type { ShellConfigData } from '../src/shared/shell-types'

const ccData: CCLaunchData = {
  version: 5,
  providers: [{
    id: 'provider-1',
    name: 'Provider',
    enabled: true,
    endpoints: [{ id: 'endpoint-1', label: 'Default', url: 'https://api.example.com' }],
    keys: [{ id: 'key-1', label: 'Key', token: 'enc:v1:not-real' }]
  }],
  launchItems: [{
    id: 'config-1',
    providerId: 'provider-1',
    endpointId: 'endpoint-1',
    keyId: 'key-1',
    name: 'Main',
    funcName: 'cc-main',
    enabled: true,
    envVars: {}
  }],
  selector: { funcName: 'cc', promptTitle: '' }
}

const shellConfig: ShellConfigData = {
  version: 1,
  variables: [{
    id: 'var-1',
    key: 'RCLAND_TEST_VAR',
    value: 'present',
    encrypted: false,
    enabled: true,
    order: 0
  }],
  pathEntries: [],
  functions: [],
  aliases: [],
  prompt: { type: 'simple' },
  output: { profiles: {} }
}

test('temporary key generation uses full shell config pipeline', () => {
  const output = generateConfigWithKey({
    shellType: 'zsh',
    ccData,
    cxData: createEmptyCXLandData(),
    shellConfig,
    keyPassphrase: 'temporary-key',
    decryptedTokens: new Map([['token:config-1', 'token-value']])
  })

  assert.match(output, /export RCLAND_TEST_VAR="present"/)
  assert.match(output, /cc-main\(\)/)
  assert.match(output, /ANTHROPIC_AUTH_TOKEN='token-value'/)
})
