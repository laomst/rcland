import type { CXLandData, CXProvider, CXConfigSet, CXEndpoint } from '@shared/types'
import { getCXEndpointUrl } from '@shared/types'
import { SYSTEM_PROXY_ENV_NAMES } from '@shared/system-proxy'
import { quotePowerShellLiteral, assertSafeShellName } from '../../shell-syntax'
import { sanitizeCodexProviderId, buildPowerShellCodexConfigArg } from './codex-args'

/**
 * Build PowerShell shell content for all enabled CXConfigSets and optional selector.
 *
 * Key differences from bash-builder:
 * - `function name { ... }` instead of `name() { ... }`
 * - `$env:OPENAI_API_KEY = 'token'` instead of env prefix
 * - try/finally to save/restore env vars
 * - Backtick for line continuation
 * - `@filtered` instead of `"${_filtered[@]}"`
 * - `Write-Error` instead of `echo ... >&2`
 * - `-n` parsed for OSC terminal title (`` `e]0;...`a ``)
 */
export function buildPowerShellCXContent(
  data: CXLandData,
  decryptedTokens: Map<string, string>
): string {
  const lines: string[] = []

  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabledConfigs = data.configs.filter((c) => c.enabled)

  for (const config of enabledConfigs) {
    const provider = providerMap.get(config.providerId)
    if (!provider) {
      writeErrorFunction(lines, config, `错误: 配置项 ${config.funcName} 的 Provider 不存在`)
      continue
    }
    if (!provider.enabled) {
      continue
    }
    writeFunction(lines, provider, config, decryptedTokens)
  }

  if (data.selector.enabled && enabledConfigs.length > 0) {
    const selectorFuncName = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelectorFunction(lines, selectorFuncName, data.selector.promptTitle, enabledConfigs, data.selector.requireSessionName !== false)
    lines.push('')
    const aliasName = assertSafeShellName(data.selector.aliasName || 'cxd', 'cxd-alias')
    lines.push(`function ${aliasName} { ${selectorFuncName} --dangerously-bypass-approvals-and-sandbox @args }`)
  }

  return lines.join('\n')
}

function writeErrorFunction(lines: string[], config: CXConfigSet, message: string): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`function ${funcName} { Write-Error ${quotePowerShellLiteral(message)} }`)
}

function writeFunction(
  lines: string[],
  provider: CXProvider,
  config: CXConfigSet,
  tokens: Map<string, string>
): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  const tokenKey = `cx-token:${config.id}`
  const tokenVal = tokens.get(tokenKey) ?? ''

  if (!tokenVal) {
    writeErrorFunction(lines, config, `错误: 配置项 ${funcName} 未设置 Token.请在 RCLand 中配置`)
    return
  }

  const endpoint = getEndpoint(provider, config.endpointId)
  const baseUrl = getCXEndpointUrl(provider, config.endpointId)
  if (!baseUrl) {
    writeErrorFunction(lines, config, `错误: 配置项 ${funcName} 的 Endpoint URL 为空`)
    return
  }

  const providerId = sanitizeCodexProviderId(funcName)

  // Collect scoped env keys for save/restore
  const scopedKeys = ['OPENAI_API_KEY']
  if (endpoint?.useSystemProxy) {
    scopedKeys.push(...SYSTEM_PROXY_ENV_NAMES)
  }

  lines.push('')
  lines.push(`function ${funcName} {`)
  lines.push('    $sn = ""; $filtered = @(); $i = 0')
  lines.push('    while ($i -lt $args.Count) {')
  lines.push('        if ($args[$i] -eq \'-n\') {')
  lines.push('            if ($i + 1 -lt $args.Count -and -not [string]::IsNullOrEmpty($args[$i + 1])) {')
  lines.push('                $sn = $args[$i + 1]; $i += 2')
  lines.push('            } else {')
  lines.push('                $i++')
  lines.push('            }')
  lines.push('        } elseif ($args[$i] -match \'^-n(.+)$\') {')
  lines.push('            $sn = $Matches[1]; $i++')
  lines.push('        } else {')
  lines.push('            $filtered += $args[$i]; $i++')
  lines.push('        }')
  lines.push('    }')
  lines.push('    if (-not [string]::IsNullOrEmpty($sn)) {')
  lines.push('        Write-Host "`e]0;CX 🔸 $sn`a" -NoNewline')
  lines.push('    }')
  lines.push('')
  lines.push(`    $previous_key = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Process')`)

  // Save proxy vars if endpoint uses system proxy
  if (endpoint?.useSystemProxy) {
    lines.push('    $previous_proxy = @{}')
    lines.push(`    foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) {`)
    lines.push('        $previous_proxy[$key] = [Environment]::GetEnvironmentVariable($key, "Process")')
    lines.push('    }')
  }

  lines.push('    try {')

  // Set proxy env vars if endpoint uses system proxy
  if (endpoint?.useSystemProxy) {
    lines.push('        $proxyEntries = _rcland_ReadOsProxy')
    lines.push('        if ($null -eq $proxyEntries) {')
    lines.push(`            Write-Error ${quotePowerShellLiteral(`配置项 ${funcName} 启用了系统代理但未检测到系统代理设置`)}`)
    lines.push('            return')
    lines.push('        }')
    lines.push('        foreach ($key in $proxyEntries.Keys) {')
    lines.push('            Set-Item "Env:$key" $proxyEntries[$key]')
    lines.push('        }')
  } else {
    // Clear proxy vars
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) { Remove-Item "Env:\$key" -ErrorAction SilentlyContinue }`)
  }

  // Set OPENAI_API_KEY
  lines.push(`        $env:OPENAI_API_KEY = ${quotePowerShellLiteral(tokenVal)}`)

  // Build codex command with -c args using backtick line continuation
  lines.push('        codex `')
  lines.push(`            -c ${buildPowerShellCodexConfigArg(`model_providers.${providerId}.name`, provider.name)} \``)
  lines.push(`            -c ${buildPowerShellCodexConfigArg(`model_providers.${providerId}.base_url`, baseUrl)} \``)
  lines.push(`            -c ${buildPowerShellCodexConfigArg(`model_providers.${providerId}.env_key`, 'OPENAI_API_KEY')} \``)
  lines.push(`            -c ${buildPowerShellCodexConfigArg(`model_providers.${providerId}.wire_api`, provider.wireApi)} \``)
  lines.push(`            -c ${buildPowerShellCodexConfigArg('model_provider', providerId)} \``)

  // Optional model
  if (config.model) {
    lines.push(`            -c ${buildPowerShellCodexConfigArg('model', config.model)} \``)
  }

  lines.push('            @filtered')
  lines.push('    } finally {')

  // Restore OPENAI_API_KEY
  lines.push('        if ($null -eq $previous_key) { Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue }')
  lines.push('        else { $env:OPENAI_API_KEY = $previous_key }')

  // Restore proxy vars if endpoint uses system proxy
  if (endpoint?.useSystemProxy) {
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) {`)
    lines.push('            if ($null -eq $previous_proxy[$key]) {')
    lines.push('                Remove-Item "Env:$key" -ErrorAction SilentlyContinue')
    lines.push('            } else {')
    lines.push('                Set-Item "Env:$key" $previous_proxy[$key]')
    lines.push('            }')
    lines.push('        }')
  } else {
    // Restore proxy vars that were cleared
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }`)
  }

  lines.push('    }')
  lines.push('}')
}

function writeSelectorFunction(
  lines: string[],
  funcName: string,
  promptTitle: string,
  entries: CXConfigSet[],
  requireN: boolean
): void {
  lines.push('')
  lines.push(`function ${funcName} {`)
  lines.push('    $session_name = ""')
  lines.push('    $remaining = @()')
  lines.push('    $i = 0')
  lines.push('    while ($i -lt $args.Count) {')
  lines.push('        if ($args[$i] -eq \'-n\') {')
  if (requireN) {
  lines.push('            if ($i + 1 -ge $args.Count -or [string]::IsNullOrEmpty($args[$i + 1])) {')
  lines.push('                Write-Host \'错误: -n 需要提供会话名称\' -ForegroundColor Red')
  lines.push('                return 1')
  lines.push('            }')
  }
  lines.push('            $session_name = $args[$i + 1]; $i += 2')
  lines.push('        } elseif ($args[$i] -match \'^-n(.+)$\') {')
  lines.push('            $session_name = $Matches[1]; $i++')
  lines.push('        } else {')
  lines.push('            $remaining += $args[$i]; $i++')
  lines.push('        }')
  lines.push('    }')
  if (requireN) {
  lines.push('    if ([string]::IsNullOrEmpty($session_name)) {')
  lines.push('        Write-Host \'错误: 必须使用 -n 指定会话名称\' -ForegroundColor Red')
  lines.push('        return 1')
  lines.push('    }')
  }
  lines.push('')
  lines.push('    if (-not [string]::IsNullOrEmpty($session_name)) {')
  lines.push('        Write-Host "`e]0;CX 🔸 $session_name`a" -NoNewline')
  lines.push('    }')
  lines.push('')
  lines.push('    $opts = @(')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`        ${quotePowerShellLiteral(`${name}:${entry.name || entry.funcName}`)}`)
  }
  lines.push('    )')
  lines.push(`    $null = prompt-select ${quotePowerShellLiteral(promptTitle)} $opts`)
  lines.push('')
  lines.push('    switch ($REPLY) {')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`        '${name}'  { ${name} @remaining; break }`)
  }
  lines.push("        default { Write-Error '无效选择'; return }")
  lines.push('    }')
  lines.push('}')
}

function getEndpoint(provider: CXProvider, endpointId?: string): CXEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
