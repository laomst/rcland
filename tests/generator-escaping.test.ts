import test from 'node:test'
import assert from 'node:assert/strict'
import { CCLandZshGenerator } from '../src/main/services/generators/sections/ccland/zsh'
import { CCLandBashGenerator } from '../src/main/services/generators/sections/ccland/bash'
import { CCLandPowerShellGenerator } from '../src/main/services/generators/sections/ccland/powershell'
import type { CCLandSectionData } from '../src/main/services/generators/sections/ccland/zsh'
import { AliasesZshGenerator } from '../src/main/services/generators/sections/aliases/zsh'
import { FunctionsZshGenerator } from '../src/main/services/generators/sections/functions/zsh'
import { FunctionsBashGenerator } from '../src/main/services/generators/sections/functions/bash'
import { FunctionsPowerShellGenerator } from '../src/main/services/generators/sections/functions/powershell'
import { createGenerateContext } from '../src/main/services/generators/context'
import { BUILTIN_FUNCTIONS } from '../src/shared/builtin-functions'

const systemProxy: SystemProxyConfig = {
  proxyEnvVars: [
    { type: 'http', value: 'http://127.0.0.1:7897' },
    { type: 'https', value: 'http://127.0.0.1:7897' },
    { type: 'all', value: 'socks5://127.0.0.1:7897' },
    { type: 'no', value: '' }
  ]
}

function sampleData(
  overrides: Partial<CCLandSectionData['ccConfig']['configs'][number]> = {},
  endpointOverrides: Partial<CCLandSectionData['ccConfig']['providers'][number]['endpoints'][number]> = {}
): CCLandSectionData {
  const config = {
    id: 'cfg-1',
    providerId: 'provider-1',
    endpointId: 'endpoint-1',
    keyId: 'key-1',
    name: 'Prod "$(touch /tmp/rcland-label)"',
    funcName: 'ccprod',
    enabled: true,
    envVars: {
      ANTHROPIC_MODEL: {
        enabled: true,
        value: 'claude"; touch /tmp/rcland-model; echo "'
      }
    },
    ...overrides
  }

  return {
    ccConfig: {
      version: 5,
      providers: [{
        id: 'provider-1',
        name: 'Provider',
        enabled: true,
        endpoints: [{
          id: 'endpoint-1',
          label: 'default',
          url: 'https://api.example.com/"$(touch /tmp/rcland-url)"',
          ...endpointOverrides
        }],
        keys: []
      }],
      configs: [config],
      selector: {
        funcName: 'cc',
        promptTitle: 'Choose "$(touch /tmp/rcland-title)"'
      }
    },
    decryptedTokens: new Map([
      ['token:cfg-1', 'tok"$(touch /tmp/rcland-token)"']
    ]),
  }
}

test('createGenerateContext uses default proxy function names when omitted', () => {
  const ctx = createGenerateContext('zsh', 'unused')

  assert.deepEqual(ctx.proxyFunctionNames, {
    proxyOn: 'proxy-on',
    proxyOff: 'proxy-off',
    proxyStatus: 'proxy-status'
  })
})

test('zsh ccland generator quotes config values as shell literals', () => {
  const output = new CCLandZshGenerator().generate(sampleData(), createGenerateContext('zsh', 'unused'))

  assert.match(output, /ANTHROPIC_AUTH_TOKEN='tok"\$\(touch \/tmp\/rcland-token\)"'/)
  assert.match(output, /ANTHROPIC_BASE_URL='https:\/\/api\.example\.com\/"\$\(touch \/tmp\/rcland-url\)"'/)
  assert.match(output, /ANTHROPIC_MODEL='claude"; touch \/tmp\/rcland-model; echo "'/)
  assert.match(output, /prompt-select 'Choose "\$\(touch \/tmp\/rcland-title\)"'/)
  assert.match(output, /'ccprod:Prod "\$\(touch \/tmp\/rcland-label\)"'/)
})

test('zsh ccland generator rejects unsafe function names', () => {
  assert.throws(
    () => new CCLandZshGenerator().generate(
      sampleData({ funcName: 'ccprod; touch /tmp/rcland-func' }),
      createGenerateContext('zsh', 'unused')
    ),
    /Invalid shell function name/
  )
})

test('zsh ccland selector requires session name and sets iTerm2 main task name', () => {
  const output = new CCLandZshGenerator().generate(sampleData(), createGenerateContext('zsh', 'unused'))

  assert.match(output, /local session_name=""/)
  assert.match(output, /local remaining_args=\(\)/)
  assert.match(output, /while \[\[ \$# -gt 0 \]\]; do/)
  assert.match(output, /-n\)/)
  assert.match(output, /-n\*\)/)
  assert.match(output, /必须使用 -n 指定会话名称/)
  assert.match(output, /set_main_task_name "CC 🔸 \$session_name"/)
  assert.match(output, /ccprod\)  ccprod -n "\$session_name" "\$\{remaining_args\[@\]\}" ;;/)
})

test('bash ccland selector requires session name and forwards remaining args', () => {
  const output = new CCLandBashGenerator().generate(sampleData(), createGenerateContext('bash', 'unused'))

  assert.match(output, /local session_name=""/)
  assert.match(output, /local remaining_args=\(\)/)
  assert.match(output, /set_main_task_name "CC 🔸 \$session_name"/)
  assert.match(output, /ccprod\)  ccprod -n "\$session_name" "\$\{remaining_args\[@\]\}" ;;/)
})

test('zsh ccland generator injects system proxy for endpoint when enabled', () => {
  const output = new CCLandZshGenerator().generate(
    sampleData({}, { useSystemProxy: true }),
    createGenerateContext('zsh', 'unused')
  )

  assert.match(output, /proxy-on \|\| return 1/)
  assert.doesNotMatch(output, /_rcland_read_os_proxy/)
  assert.doesNotMatch(output, /eval "\$_proxy_lines"/)
  assert.match(output, /ANTHROPIC_AUTH_TOKEN='tok"\$\(touch \/tmp\/rcland-token\)"'/)
  assert.doesNotMatch(output, /export http_proxy=/)
})

test('zsh ccland generator disables inherited proxy for endpoint when disabled', () => {
  const output = new CCLandZshGenerator().generate(
    sampleData({}, { useSystemProxy: false }),
    createGenerateContext('zsh', 'unused')
  )

  assert.match(output, /proxy-off/)
  assert.doesNotMatch(output, /unset http_proxy HTTP_PROXY https_proxy HTTPS_PROXY all_proxy ALL_PROXY no_proxy NO_PROXY/)
  assert.match(output, /claude "\$@"/)
})

test('powershell ccland generator restores process environment after scoped proxy run', () => {
  const output = new CCLandPowerShellGenerator().generate(
    sampleData({}, { useSystemProxy: true }),
    createGenerateContext('powershell', 'unused')
  )

  assert.match(output, /\$proxyEntries = _rcland_ReadOsProxy/)
  assert.match(output, /\$env:ANTHROPIC_AUTH_TOKEN = 'tok"\$\(touch \/tmp\/rcland-token\)"'/)
  assert.match(output, /try \{/)
  assert.match(output, /finally \{/)
  assert.match(output, /Set-Item "Env:\$key" \$previous\[\$key\]/)
  // Real function just passes all args to claude
  assert.match(output, /claude @args/)
  // Selector function also parses -n
  assert.match(output, /\$session_name = ""/)
  assert.match(output, /set_main_task_name "CC 🔸 \$session_name"/)
})

test('zsh alias generator allows dot aliases', () => {
  const output = new AliasesZshGenerator().generate([
    {
      id: 'alias-up',
      alias: '..',
      command: 'cd ..',
      description: '返回上级目录',
      enabled: true,
      order: 0
    }
  ], createGenerateContext('zsh', 'unused'))

  assert.match(output, /alias \.\.='cd \.\.'/)
})

test('zsh alias generator allows tilde aliases', () => {
  const output = new AliasesZshGenerator().generate([
    {
      id: 'alias-home',
      alias: '~',
      command: 'cd ~',
      description: '回到主目录',
      enabled: true,
      order: 0
    }
  ], createGenerateContext('zsh', 'unused'))

  assert.match(output, /alias ~='cd ~'/)
})

test('zsh alias generator rejects shell metacharacters in alias names', () => {
  assert.throws(
    () => new AliasesZshGenerator().generate([
      {
        id: 'alias-bad',
        alias: 'bad;touch',
        command: 'pwd',
        enabled: true,
        order: 0
      }
    ], createGenerateContext('zsh', 'unused')),
    /Invalid shell alias name/
  )
})

test('set_main_task_name builtin is generated for zsh, bash and powershell with terminal detection', () => {
  const builtin = BUILTIN_FUNCTIONS.find((fn) => fn.id === 'builtin:set-main-task-name')
  assert.ok(builtin)

  const zshOutput = new FunctionsZshGenerator().generate([builtin], createGenerateContext('zsh', 'unused'))
  const bashOutput = new FunctionsBashGenerator().generate([builtin], createGenerateContext('bash', 'unused'))
  const powershellOutput = new FunctionsPowerShellGenerator().generate([builtin], createGenerateContext('powershell', 'unused'))

  assert.match(zshOutput, /set_main_task_name\(\) \{/)
  assert.match(zshOutput, /SetUserVar=mainTask=%s/)
  assert.match(zshOutput, /TERM_PROGRAM/)
  assert.match(bashOutput, /set_main_task_name\(\) \{/)
  assert.match(bashOutput, /TERM_PROGRAM/)
  assert.match(powershellOutput, /set_main_task_name/)
  assert.match(powershellOutput, /\[Console\]::Write/)
})
