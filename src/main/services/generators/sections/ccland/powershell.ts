import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ConfigSet, Provider, ProviderEndpoint } from '@shared/types'
import { getEndpointUrl, CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import type { ShellType } from '@shared/shell'
import type { CCLandSectionData } from './zsh'
import { assertSafeEnvName, assertSafeShellName, quotePowerShellLiteral } from '../../shell-syntax'
import {
  getSystemProxyEnvNames,
  SYSTEM_PROXY_ENV_NAMES,
  type SystemProxyConfig,
} from '@shared/system-proxy'

export class CCLandPowerShellGenerator implements SectionGenerator<CCLandSectionData> {
  readonly sectionName = 'ccland'
  readonly shellType: ShellType = 'powershell'

  generate(data: CCLandSectionData, ctx: GenerateContext): string {
    const { ccConfig, decryptedTokens } = data
    const lines: string[] = []

    // CC launch functions

    const providerMap = new Map(ccConfig.providers.map((p) => [p.id, p]))
    const enabledProviderIds = new Set(ccConfig.providers.filter((p) => p.enabled).map((p) => p.id))
    const enabledConfigs = ccConfig.configs.filter((c) => c.enabled && enabledProviderIds.has(c.providerId))

    for (const config of enabledConfigs) {
      const provider = providerMap.get(config.providerId)
      if (!provider) continue
      this.writeFunction(lines, provider, config, decryptedTokens, data.systemProxy)
    }

    if (ccConfig.selector.enabled) {
      const entries = enabledConfigs.map((c) => ({
        funcName: assertSafeShellName(c.funcName, c.name || c.id),
        label: c.name || c.funcName
      }))
      if (entries.length > 0) {
        const selectorFuncName = assertSafeShellName(ccConfig.selector.funcName, 'selector')
        this.writeSelectorFunction(lines, selectorFuncName, ccConfig.selector.promptTitle, entries)
        lines.push('')
        lines.push(`function ccd { ${selectorFuncName} --dangerously-skip-permissions @args }`)
      }

      // ccl: local-only selector
      const localEntries = enabledConfigs
        .filter((c) => c.localOnly)
        .map((c) => ({
          funcName: assertSafeShellName(c.funcName, c.name || c.id),
          label: c.name || c.funcName
        }))
      if (localEntries.length > 0) {
        this.writeSelectorFunction(lines, 'ccl', ccConfig.selector.promptTitle, localEntries)
        lines.push('')
        lines.push(`function ccld { ccl --dangerously-skip-permissions @args }`)
      }
    }

    return lines.join('\n')
  }

  private writeSelectorFunction(
    lines: string[],
    funcName: string,
    promptTitle: string,
    entries: { funcName: string; label: string }[]
  ): void {
    lines.push('')
    lines.push(`function ${funcName} {`)
    lines.push('    $session_name = ""')
    lines.push('    $remaining_args = @()')
    lines.push('    $i = 0')
    lines.push('    while ($i -lt $args.Count) {')
    lines.push('        if ($args[$i] -eq \'-n\') {')
    lines.push('            if ($i + 1 -ge $args.Count -or [string]::IsNullOrEmpty($args[$i + 1])) {')
    lines.push('                Write-Host \'错误: -n 需要提供会话名称，例如: cc -n 重构认证模块\' -ForegroundColor Red')
    lines.push('                return 1')
    lines.push('            }')
    lines.push('            $session_name = $args[$i + 1]; $i += 2')
    lines.push('        } elseif ($args[$i] -match \'^-n(.+)$\') {')
    lines.push('            $session_name = $Matches[1]; $i++')
    lines.push('        } else {')
    lines.push('            $remaining_args += $args[$i]; $i++')
    lines.push('        }')
    lines.push('    }')
    lines.push('    if ([string]::IsNullOrEmpty($session_name)) {')
    lines.push('        Write-Host \'错误: 必须使用 -n 指定会话名称，例如: cc -n 重构认证模块\' -ForegroundColor Red')
    lines.push('        return 1')
    lines.push('    }')
    lines.push('')
    lines.push('    set_main_task_name "CC 🔸 $session_name"')
    lines.push('')
    lines.push('    $opts = @(')
    for (const entry of entries) {
      lines.push(`        ${quotePowerShellLiteral(`${entry.funcName}:${entry.label}`)}`)
    }
    lines.push('    )')
    lines.push(`    $null = prompt-select ${quotePowerShellLiteral(promptTitle)} $opts`)
    lines.push('')
    lines.push('    switch ($REPLY) {')
    for (const entry of entries) {
      lines.push(`        '${entry.funcName}'  { ${entry.funcName} -n $session_name @remaining_args ; break }`)
    }
    lines.push('    }')
    lines.push('}')
  }

  private writeFunction(
    lines: string[],
    provider: Provider,
    config: ConfigSet,
    tokens: Map<string, string>,
    systemProxy: SystemProxyConfig
  ): void {
    lines.push('')

    const tokenVal = tokens.get(`token:${config.id}`)
    if (!tokenVal) {
      const funcName = assertSafeShellName(config.funcName, config.name || config.id)
      lines.push(`function ${funcName} {`)
      lines.push(`    Write-Error ${quotePowerShellLiteral(`配置项 ${funcName} 未设置 Token.请在 RCLand 中配置`)}`)
      lines.push('}')
      return
    }

    const funcName = assertSafeShellName(config.funcName, config.name || config.id)
    const endpoint = getEndpoint(provider, config.endpointId)
    const scopedKeys = [
      ...SYSTEM_PROXY_ENV_NAMES,
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_BASE_URL',
      ...CLAUDE_ENV_VAR_KEYS
    ]
    lines.push(`function ${funcName} {`)
    lines.push('    $sn = ""; $ra = @(); $i = 0')
    lines.push('    while ($i -lt $args.Count) {')
    lines.push('        if ($args[$i] -eq \'-n\') {')
    lines.push('            if ($i + 1 -ge $args.Count -or [string]::IsNullOrEmpty($args[$i + 1])) {')
    lines.push('                Write-Host \'错误: -n 需要提供会话名称\' -ForegroundColor Red; return 1')
    lines.push('            }')
    lines.push('            $sn = $args[$i + 1]; $i += 2')
    lines.push('        } elseif ($args[$i] -match \'^-n(.+)$\') {')
    lines.push('            $sn = $Matches[1]; $i++')
    lines.push('        } else {')
    lines.push('            $ra += $args[$i]; $i++')
    lines.push('        }')
    lines.push('    }')
    lines.push('    if ([string]::IsNullOrEmpty($sn)) {')
    lines.push('        Write-Host \'错误: 必须使用 -n 指定会话名称\' -ForegroundColor Red; return 1')
    lines.push('    }')
    lines.push('    set_main_task_name "CC 🔸 $sn"')
    lines.push('')
    lines.push(`    $scopedEnvKeys = @(${[...new Set(scopedKeys)].map((key) => quotePowerShellLiteral(key)).join(', ')})`)
    lines.push('    $previous = @{}')
    lines.push('    foreach ($key in $scopedEnvKeys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process") }')
    lines.push('    try {')

    if (endpoint?.useSystemProxy) {
      for (const { type, value } of systemProxy.proxyEnvVars.filter((item) => item.value.trim())) {
        for (const key of getSystemProxyEnvNames(type)) {
          lines.push(`        $env:${key} = ${quotePowerShellLiteral(value)}`)
        }
      }
    } else {
      lines.push('        foreach ($key in @(' + SYSTEM_PROXY_ENV_NAMES.map((key) => quotePowerShellLiteral(key)).join(', ') + ')) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }')
    }

    lines.push(`        $env:ANTHROPIC_AUTH_TOKEN = ${quotePowerShellLiteral(tokenVal)}`)
    lines.push(`        $env:ANTHROPIC_BASE_URL = ${quotePowerShellLiteral(getEndpointUrl(provider, config.endpointId))}`)

    for (const key of CLAUDE_ENV_VAR_KEYS) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        lines.push(`        $env:${assertSafeEnvName(key, funcName)} = ${quotePowerShellLiteral(setting.value)}`)
      }
    }

    lines.push('        claude -n $sn @ra')
    lines.push('    } finally {')
    lines.push('        foreach ($key in $scopedEnvKeys) {')
    lines.push('            if ($null -eq $previous[$key]) {')
    lines.push('                Remove-Item "Env:$key" -ErrorAction SilentlyContinue')
    lines.push('            } else {')
    lines.push('                Set-Item "Env:$key" $previous[$key]')
    lines.push('            }')
    lines.push('        }')
    lines.push('    }')
    lines.push('}')
  }
}

function getEndpoint(provider: Provider, endpointId?: string): ProviderEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((endpoint) => endpoint.id === endpointId) ?? provider.endpoints[0]
}
