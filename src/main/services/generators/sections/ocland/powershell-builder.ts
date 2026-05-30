import type { OCLandData, OCProvider, OCLaunchItem, OCEndpoint } from '@shared/types'
import { getOCEndpointUrl } from '@shared/types'
import { SYSTEM_PROXY_ENV_NAMES } from '@shared/system-proxy'
import { quotePowerShellLiteral, assertSafeShellName } from '../../shell-syntax'
import { ocKeyEnvVarName, assertSafeOCConfigId } from '../../oc-config'

/**
 * Build PowerShell content for all enabled OCLaunchItems and optional selector.
 * PowerShell functions lack subshell isolation, so env vars are saved/restored via try/finally.
 */
export function buildPowerShellOCContent(
  data: OCLandData,
  decryptedTokens: Map<string, string>
): string {
  const lines: string[] = []
  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabled = data.launchItems.filter((c) => c.enabled)

  for (const item of enabled) {
    if (item.passthrough) { writePassthroughFunction(lines, item); continue }
    const provider = providerMap.get(item.providerId)
    if (!provider) { writeErrorFunction(lines, item, `错误: 启动项 ${item.funcName} 的 Provider 不存在`); continue }
    if (!provider.enabled) continue
    writeFunction(lines, provider, item, decryptedTokens)
  }

  if (enabled.length > 0) {
    const selFn = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelectorFunction(lines, selFn, data.selector.promptTitle, enabled)
  }

  const ls = data.selector.localSelector
  if (ls?.enabled) {
    const localFn = assertSafeShellName(ls.funcName || 'ocl', 'local-selector')
    const localEntries = enabled.filter((c) => c.localOnly)
    if (localEntries.length > 0) {
      writeSelectorFunction(lines, localFn, ls.promptTitle || data.selector.promptTitle, localEntries)
    } else {
      lines.push('')
      lines.push(`function ${localFn} { Write-Error ${quotePowerShellLiteral('错误: 没有任何本机启动器,请在 RCLand 中将启动项标记为「仅本机」')} }`)
    }
  }

  if (data.selector.kanban?.enabled) {
    const kFn = assertSafeShellName(data.selector.kanban.funcName || 'show-oc-usage', 'kanban')
    lines.push('')
    lines.push(`function ${kFn} {`)
    lines.push('  if (-not $env:CCLAND_OC_TOKEN_KANBAN) {')
    lines.push('    Write-Error "错误：未配置看板 URL，请在供应商管理中设置"')
    lines.push('    return')
    lines.push('  }')
    lines.push('  Start-Process $env:CCLAND_OC_TOKEN_KANBAN')
    lines.push('}')
  }

  return lines.join('\n')
}

function writeErrorFunction(lines: string[], item: OCLaunchItem, message: string): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  lines.push('')
  lines.push(`function ${fn} { Write-Error ${quotePowerShellLiteral(message)} }`)
}

function writeFunction(
  lines: string[],
  provider: OCProvider,
  item: OCLaunchItem,
  tokens: Map<string, string>
): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  const tokenVal = tokens.get(`oc-token:${item.id}`) ?? ''
  if (!tokenVal) { writeErrorFunction(lines, item, `错误: 启动项 ${fn} 未设置 Token.请在 RCLand 中配置`); return }
  const baseUrl = getOCEndpointUrl(provider, item.endpointId)
  if (!baseUrl) { writeErrorFunction(lines, item, `错误: 启动项 ${fn} 的 Endpoint URL 为空`); return }

  const endpoint = getEndpoint(provider, item.endpointId)
  const envVar = ocKeyEnvVarName(item.id)

  lines.push('')
  lines.push(`function ${fn} {`)
  lines.push(`    $previous_key = [Environment]::GetEnvironmentVariable('${envVar}', 'Process')`)
  lines.push(`    $previous_config = [Environment]::GetEnvironmentVariable('OPENCODE_CONFIG', 'Process')`)
  if (provider.kanbanUrl) {
    lines.push(`    $previous_kanban = [Environment]::GetEnvironmentVariable('CCLAND_OC_TOKEN_KANBAN', 'Process')`)
  }
  if (endpoint?.useSystemProxy) {
    lines.push('    $previous_proxy = @{}')
    lines.push(`    foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) {`)
    lines.push('        $previous_proxy[$key] = [Environment]::GetEnvironmentVariable($key, "Process")')
    lines.push('    }')
  }

  lines.push('    try {')

  if (endpoint?.useSystemProxy) {
    lines.push('        $proxyEntries = _rcland_ReadOsProxy')
    lines.push('        if ($null -eq $proxyEntries) {')
    lines.push(`            Write-Error ${quotePowerShellLiteral(`启动项 ${fn} 启用了系统代理但未检测到系统代理设置`)}`)
    lines.push('            return')
    lines.push('        }')
    lines.push('        foreach ($key in $proxyEntries.Keys) {')
    lines.push('            Set-Item "Env:$key" $proxyEntries[$key]')
    lines.push('        }')
  } else {
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }`)
  }

  lines.push(`        $env:${envVar} = ${quotePowerShellLiteral(tokenVal)}`)
  // item.id is validated (UUID-style) before embedding into the config path.
  lines.push(`        $env:OPENCODE_CONFIG = ${quotePowerShellLiteral(`$HOME\\.rcland\\opencode\\${assertSafeOCConfigId(item.id)}.json`)}`)
  if (provider.kanbanUrl) {
    lines.push(`        $env:CCLAND_OC_TOKEN_KANBAN = ${quotePowerShellLiteral(provider.kanbanUrl)}`)
  }

  if (item.modelId) {
    lines.push(`        opencode -m ${quotePowerShellLiteral(`${provider.id}/${item.modelId}`)} @args`)
  } else {
    lines.push('        opencode @args')
  }

  lines.push('    } finally {')
  lines.push(`        if ($null -eq $previous_key) { Remove-Item Env:${envVar} -ErrorAction SilentlyContinue }`)
  lines.push(`        else { $env:${envVar} = $previous_key }`)
  lines.push('        if ($null -eq $previous_config) { Remove-Item Env:OPENCODE_CONFIG -ErrorAction SilentlyContinue }')
  lines.push('        else { $env:OPENCODE_CONFIG = $previous_config }')
  if (provider.kanbanUrl) {
    lines.push('        if ($null -eq $previous_kanban) { Remove-Item Env:CCLAND_OC_TOKEN_KANBAN -ErrorAction SilentlyContinue }')
    lines.push('        else { $env:CCLAND_OC_TOKEN_KANBAN = $previous_kanban }')
  }
  if (endpoint?.useSystemProxy) {
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) {`)
    lines.push('            if ($null -eq $previous_proxy[$key]) {')
    lines.push('                Remove-Item "Env:$key" -ErrorAction SilentlyContinue')
    lines.push('            } else {')
    lines.push('                Set-Item "Env:$key" $previous_proxy[$key]')
    lines.push('            }')
    lines.push('        }')
  } else {
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }`)
  }
  lines.push('    }')
  lines.push('}')
}

function writeSelectorFunction(
  lines: string[],
  funcName: string,
  promptTitle: string,
  entries: OCLaunchItem[]
): void {
  lines.push('')
  lines.push(`function ${funcName} {`)
  lines.push('    $opts = @(')
  for (const e of entries) {
    const name = assertSafeShellName(e.funcName, e.name || e.id)
    lines.push(`        ${quotePowerShellLiteral(`${name}:${e.name || e.funcName}`)}`)
  }
  lines.push('    )')
  lines.push(`    $null = prompt-select ${quotePowerShellLiteral(promptTitle)} $opts`)
  lines.push('')
  lines.push('    switch ($REPLY) {')
  for (const e of entries) {
    const name = assertSafeShellName(e.funcName, e.name || e.id)
    lines.push(`        '${name}'  { ${name} @args ; break }`)
  }
  lines.push("        default { Write-Error '无效选择'; return }")
  lines.push('    }')
  lines.push('}')
}

function writePassthroughFunction(lines: string[], item: OCLaunchItem): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  lines.push('')
  lines.push(`function ${fn} {`)
  lines.push(`    $scopedEnvKeys = @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})`)
  lines.push('    $previous = @{}')
  lines.push('    foreach ($key in $scopedEnvKeys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process") }')
  lines.push('    try {')
  if (item.useSystemProxy) {
    lines.push('        $proxyEntries = _rcland_ReadOsProxy')
    lines.push('        if ($null -eq $proxyEntries) {')
    lines.push(`            Write-Error ${quotePowerShellLiteral(`启动项 ${fn} 启用了系统代理但未检测到系统代理设置`)}`)
    lines.push('            return')
    lines.push('        }')
    lines.push('        foreach ($key in $proxyEntries.Keys) {')
    lines.push('            Set-Item "Env:$key" $proxyEntries[$key]')
    lines.push('        }')
  } else {
    lines.push(`        foreach ($key in @(${SYSTEM_PROXY_ENV_NAMES.map((k) => quotePowerShellLiteral(k)).join(', ')})) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }`)
  }
  const cmd = item.passthroughCommand?.trim() || 'opencode'
  lines.push(`        ${assertSafeShellName(cmd, fn)} @args`)
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

function getEndpoint(provider: OCProvider, endpointId?: string): OCEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
