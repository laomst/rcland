import type { CXLandData, CXProvider, CXLaunchItem, CXEndpoint } from '@shared/types'
import { getCXEndpointUrl } from '@shared/types'
import { SYSTEM_PROXY_ENV_NAMES } from '@shared/system-proxy'
import { quotePowerShellLiteral, assertSafeShellName } from '../../shell-syntax'
import { sanitizeCodexProviderId, buildPowerShellCodexConfigArg } from './codex-args'

/**
 * Build PowerShell shell content for all enabled CXLaunchItems and optional selector.
 *
 * Key differences from bash-builder:
 * - `function name { ... }` instead of `name() { ... }`
 * - `$env:OPENAI_API_KEY = 'token'` instead of env prefix
 * - try/finally to save/restore env vars
 * - Backtick for line continuation
 * - `@filtered` instead of `"${_filtered[@]}"`
 * - `Write-Error` instead of `echo ... >&2`
 * - `-n` stripped from args and used for OSC title when provided
 */
export function buildPowerShellCXContent(
  data: CXLandData,
  decryptedTokens: Map<string, string>
): string {
  const lines: string[] = []

  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabledConfigs = data.launchItems.filter((c) => c.enabled)

  for (const config of enabledConfigs) {
    if (config.passthrough) {
      writePassthroughFunction(lines, config)
      continue
    }
    const provider = providerMap.get(config.providerId)
    if (!provider) {
      writeErrorFunction(lines, config, `错误: 启动项 ${config.funcName} 的 Provider 不存在`)
      continue
    }
    if (!provider.enabled) {
      continue
    }
    writeFunction(lines, provider, config, decryptedTokens)
  }

  // Main selector (always generated when configs exist)
  if (enabledConfigs.length > 0) {
    const selectorFuncName = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelectorFunction(lines, selectorFuncName, data.selector.promptTitle, enabledConfigs)
    if (data.selector.aliasEnabled !== false) {
      lines.push('')
      lines.push(`function ${selectorFuncName}d { ${selectorFuncName} --dangerously-bypass-approvals-and-sandbox @args }`)
    }
  }

  // local-only selector (independent of main selector)
  const ls = data.selector.localSelector
  if (ls?.enabled) {
    const localFuncName = assertSafeShellName(ls.funcName || 'cxl', 'local-selector')
    const localEntries = enabledConfigs.filter((c) => c.localOnly)
    if (localEntries.length > 0) {
      writeSelectorFunction(lines, localFuncName, ls.promptTitle || data.selector.promptTitle, localEntries)
    } else {
      lines.push('')
      lines.push(`function ${localFuncName} { Write-Error ${quotePowerShellLiteral('错误: 没有任何本机启动器,请在 RCLand 中将启动项标记为「仅本机」')} }`)
    }
    if (ls.aliasEnabled !== false) {
      lines.push('')
      lines.push(`function ${localFuncName}d { ${localFuncName} --dangerously-bypass-approvals-and-sandbox @args }`)
    }
  }

  // kanban function
  if (data.selector.kanban?.enabled) {
    const kanbanFuncName = data.selector.kanban.funcName || 'show-cx-usage'
    lines.push('')
    lines.push(`function ${kanbanFuncName} {`)
    lines.push('  if (-not $env:CCLAND_CX_TOKEN_KANBAN) {')
    lines.push('    Write-Error "错误：未配置看板 URL，请在供应商管理中设置"')
    lines.push('    return')
    lines.push('  }')
    lines.push('  Start-Process $env:CCLAND_CX_TOKEN_KANBAN')
    lines.push('}')
  }

  return lines.join('\n')
}

function writeErrorFunction(lines: string[], config: CXLaunchItem, message: string): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`function ${funcName} { Write-Error ${quotePowerShellLiteral(message)} }`)
}

function writeFunction(
  lines: string[],
  provider: CXProvider,
  config: CXLaunchItem,
  tokens: Map<string, string>
): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  const tokenKey = `cx-token:${config.id}`
  const tokenVal = tokens.get(tokenKey) ?? ''

  if (!tokenVal) {
    writeErrorFunction(lines, config, `错误: 启动项 ${funcName} 未设置 Token.请在 RCLand 中配置`)
    return
  }

  const endpoint = getEndpoint(provider, config.endpointId)
  const baseUrl = getCXEndpointUrl(provider, config.endpointId)
  if (!baseUrl) {
    writeErrorFunction(lines, config, `错误: 启动项 ${funcName} 的 Endpoint URL 为空`)
    return
  }

  const providerId = sanitizeCodexProviderId(funcName)

  // Collect scoped env keys for save/restore
  const scopedKeys = ['OPENAI_API_KEY', 'CCLAND_CX_TOKEN_KANBAN']
  if (endpoint?.useSystemProxy) {
    scopedKeys.push(...SYSTEM_PROXY_ENV_NAMES)
  }

  lines.push('')
  lines.push(`function ${funcName} {`)

  lines.push(`    $previous_key = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Process')`)

  if (provider.kanbanUrl) {
    lines.push(`    $previous_kanban = [Environment]::GetEnvironmentVariable('CCLAND_CX_TOKEN_KANBAN', 'Process')`)
  }

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
    lines.push(`            Write-Error ${quotePowerShellLiteral(`启动项 ${funcName} 启用了系统代理但未检测到系统代理设置`)}`)
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

  if (provider.kanbanUrl) {
    lines.push(`        $env:CCLAND_CX_TOKEN_KANBAN = ${quotePowerShellLiteral(provider.kanbanUrl)}`)
  }

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

  lines.push('            @args')
  lines.push('    } finally {')

  // Restore OPENAI_API_KEY
  lines.push('        if ($null -eq $previous_key) { Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue }')
  lines.push('        else { $env:OPENAI_API_KEY = $previous_key }')

  // Restore kanban env var
  if (provider.kanbanUrl) {
    lines.push('        if ($null -eq $previous_kanban) { Remove-Item Env:CCLAND_CX_TOKEN_KANBAN -ErrorAction SilentlyContinue }')
    lines.push('        else { $env:CCLAND_CX_TOKEN_KANBAN = $previous_kanban }')
  }

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
  entries: CXLaunchItem[]
): void {
  lines.push('')
  lines.push(`function ${funcName} {`)
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
    lines.push(`        '${name}'  { ${name} @args ; break }`)
  }
  lines.push("        default { Write-Error '无效选择'; return }")
  lines.push('    }')
  lines.push('}')
}

function writePassthroughFunction(lines: string[], config: CXLaunchItem): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  const scopedKeys = [...SYSTEM_PROXY_ENV_NAMES]
  lines.push('')
  lines.push(`function ${funcName} {`)
  lines.push(`    $scopedEnvKeys = @(${scopedKeys.map((key) => quotePowerShellLiteral(key)).join(', ')})`)
  lines.push('    $previous = @{}')
  lines.push('    foreach ($key in $scopedEnvKeys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process") }')
  lines.push('    try {')
  if (config.useSystemProxy) {
    lines.push('        $proxyEntries = _rcland_ReadOsProxy')
    lines.push('        if ($null -eq $proxyEntries) {')
    lines.push(`            Write-Error ${quotePowerShellLiteral(`启动项 ${funcName} 启用了系统代理但未检测到系统代理设置`)}`)
    lines.push('            return')
    lines.push('        }')
    lines.push('        foreach ($key in $proxyEntries.Keys) {')
    lines.push('            Set-Item "Env:$key" $proxyEntries[$key]')
    lines.push('        }')
  } else {
    lines.push('        foreach ($key in @(' + SYSTEM_PROXY_ENV_NAMES.map((key) => quotePowerShellLiteral(key)).join(', ') + ')) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }')
  }
  lines.push('        codex @args')
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

function getEndpoint(provider: CXProvider, endpointId?: string): CXEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
