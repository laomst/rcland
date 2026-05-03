import { DEFAULT_PROXY_FUNCTION_NAMES, type CXLandData, type CXProvider, type CXLaunchItem, type CXEndpoint, type ProxyFunctionNames } from '@shared/types'
import { getCXEndpointUrl } from '@shared/types'
import { quoteBashLikeLiteral, assertSafeShellName } from '../../shell-syntax'
import { sanitizeCodexProviderId, buildBashCodexConfigArg } from './codex-args'

/**
 * Build bash/zsh shell content for all enabled CXLaunchItems and optional selector.
 *
 * Key differences from CC (Claude Code):
 * - Uses `codex` command, NOT `claude`
 * - Uses `-c key="value"` dynamic config, NOT environment variable templates
 * - `-n` stripped from args and used for OSC title when provided
 * - `OPENAI_API_KEY` env var, not `ANTHROPIC_API_KEY`
 * - `cxd` alias uses `--dangerously-bypass-approvals-and-sandbox`
 */
export function buildBashLikeCXContent(
  data: CXLandData,
  decryptedTokens: Map<string, string>,
  proxyFns: ProxyFunctionNames = DEFAULT_PROXY_FUNCTION_NAMES
): string {
  const lines: string[] = []

  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabledConfigs = data.launchItems.filter((c) => c.enabled)

  for (const config of enabledConfigs) {
    if (config.passthrough) {
      writePassthroughFunction(lines, config, proxyFns)
      continue
    }
    const provider = providerMap.get(config.providerId)
    if (!provider) {
      writeErrorStub(lines, config, `错误: 启动项 ${config.funcName} 的 Provider 不存在`)
      continue
    }
    if (!provider.enabled) {
      continue
    }
    writeFunction(lines, provider, config, decryptedTokens, proxyFns)
  }

  // Main selector (always generated when configs exist)
  if (enabledConfigs.length > 0) {
    const selectorFuncName = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelectorFunction(lines, selectorFuncName, data.selector.promptTitle, enabledConfigs, data.selector.requireSessionName !== false)
    if (data.selector.aliasEnabled !== false) {
      lines.push('')
      lines.push(`alias ${selectorFuncName}d='${selectorFuncName} --dangerously-bypass-approvals-and-sandbox'`)
    }
  }

  // local-only selector (independent of main selector)
  const ls = data.selector.localSelector
  if (ls?.enabled) {
    const localFuncName = assertSafeShellName(ls.funcName || 'cxl', 'local-selector')
    const localEntries = enabledConfigs.filter((c) => c.localOnly)
    if (localEntries.length > 0) {
      writeSelectorFunction(lines, localFuncName, ls.promptTitle || data.selector.promptTitle, localEntries, ls.requireSessionName !== false)
    } else {
      lines.push('')
      lines.push(`${localFuncName}() { echo ${quoteBashLikeLiteral(`错误: 没有任何本机启动器,请在 RCLand 中将启动项标记为「仅本机」`)} >&2; return 1; }`)
    }
    if (ls.aliasEnabled !== false) {
      lines.push('')
      lines.push(`alias ${localFuncName}d='${localFuncName} --dangerously-bypass-approvals-and-sandbox'`)
    }
  }

  // kanban function
  if (data.selector.kanban?.enabled) {
    const kanbanFuncName = data.selector.kanban.funcName || 'show-cx-usage'
    lines.push('')
    lines.push(`${kanbanFuncName}() {`)
    lines.push('  if [ -z "$CCLAND_CX_TOKEN_KANBAN" ]; then')
    lines.push('    echo "\\033[31m错误：未配置看板 URL，请在供应商管理中设置\\033[0m" >&2')
    lines.push('    return 1')
    lines.push('  fi')
    lines.push('  (open "$CCLAND_CX_TOKEN_KANBAN" 2>/dev/null || xdg-open "$CCLAND_CX_TOKEN_KANBAN" 2>/dev/null) &')
    lines.push('}')
  }

  return lines.join('\n')
}

function writeErrorStub(lines: string[], config: CXLaunchItem, message: string): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`${funcName}() { echo ${quoteBashLikeLiteral(message)} >&2; return 1; }`)
}

function writeFunction(
  lines: string[],
  provider: CXProvider,
  config: CXLaunchItem,
  tokens: Map<string, string>,
  proxyFns: ProxyFunctionNames
): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  const tokenKey = `cx-token:${config.id}`
  const tokenVal = tokens.get(tokenKey) ?? ''

  if (!tokenVal) {
    writeErrorStub(lines, config, `错误: 启动项 ${funcName} 未设置 Token.请在 RCLand 中配置`)
    return
  }

  const endpoint = getEndpoint(provider, config.endpointId)
  const baseUrl = getCXEndpointUrl(provider, config.endpointId)
  if (!baseUrl) {
    writeErrorStub(lines, config, `错误: 启动项 ${funcName} 的 Endpoint URL 为空`)
    return
  }

  const providerId = sanitizeCodexProviderId(funcName)

  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  (')

  if (endpoint?.useSystemProxy) {
    lines.push(`    ${proxyFns.proxyOn} || return 1`)
  } else {
    lines.push(`    ${proxyFns.proxyOff}`)
  }

  lines.push('    local _sn=""')
  lines.push('    local _filtered=()')
  lines.push('    while [[ $# -gt 0 ]]; do')
  lines.push('      case "$1" in')
  lines.push('        -n)')
  lines.push('          if [[ $# -lt 2 || -z "$2" ]]; then')
  lines.push("            printf '\\033[31m错误: -n 需要提供会话名称\\033[0m\\n' >&2")
  lines.push('            return 1')
  lines.push('          fi')
  lines.push('          _sn="$2"; shift 2')
  lines.push('          ;;')
  lines.push('        -n*) _sn="${1#-n}"; shift ;;')
  lines.push('        *) _filtered+=("$1"); shift ;;')
  lines.push('      esac')
  lines.push('    done')
  lines.push('    if [[ -n "$_sn" ]]; then')
  // Sanitize session name before embedding in OSC sequences (strip C0 controls + DEL).
  lines.push('      local _safe_sn="$(printf \'%s\' "$_sn" | LC_ALL=C tr -d \'\\000-\\037\\177\')"')
  lines.push(`      printf '\\033]0;%s\\007' "CX 🔸 $_safe_sn"`)
  lines.push('    fi')
  lines.push(`    export OPENAI_API_KEY=${quoteBashLikeLiteral(tokenVal)}`)

  if (provider.kanbanUrl) {
    lines.push(`    export CCLAND_CX_TOKEN_KANBAN=${quoteBashLikeLiteral(provider.kanbanUrl)}`)
  }

  lines.push('    codex \\')

  // -c args: provider config
  lines.push(`      -c ${buildBashCodexConfigArg(`model_providers.${providerId}.name`, provider.name)} \\`)
  lines.push(`      -c ${buildBashCodexConfigArg(`model_providers.${providerId}.base_url`, baseUrl)} \\`)
  lines.push(`      -c ${buildBashCodexConfigArg(`model_providers.${providerId}.env_key`, 'OPENAI_API_KEY')} \\`)
  lines.push(`      -c ${buildBashCodexConfigArg(`model_providers.${providerId}.wire_api`, provider.wireApi)} \\`)

  // -c args: active provider selection
  lines.push(`      -c ${buildBashCodexConfigArg('model_provider', providerId)} \\`)

  // -c args: model (optional)
  if (config.model) {
    lines.push(`      -c ${buildBashCodexConfigArg('model', config.model)} \\`)
  }

  lines.push('      "${_filtered[@]}"')
  lines.push('  )')
  lines.push('}')
}

function writeSelectorFunction(
  lines: string[],
  funcName: string,
  promptTitle: string,
  entries: CXLaunchItem[],
  requireN: boolean
): void {
  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  local _session_name=""')
  lines.push('  local _remaining=()')
  lines.push('')
  lines.push('  while [[ $# -gt 0 ]]; do')
  lines.push('    case "$1" in')
  lines.push('      -n)')
  // Always validate missing -n value when -n is provided, even if session name is optional.
  lines.push('        if [[ $# -lt 2 || -z "$2" ]]; then')
  lines.push("          printf '\\033[31m错误: -n 需要提供会话名称\\033[0m\\n' >&2")
  lines.push('          return 1')
  lines.push('        fi')
  lines.push('        _session_name="$2"; shift 2')
  lines.push('        ;;')
  lines.push('      -n*)')
  lines.push('        _session_name="${1#-n}"; shift')
  lines.push('        ;;')
  lines.push('      *)')
  lines.push('        _remaining+=("$1"); shift')
  lines.push('        ;;')
  lines.push('    esac')
  lines.push('  done')
  lines.push('')
  if (requireN) {
  lines.push('  if [[ -z "$_session_name" ]]; then')
  lines.push("    printf '\\033[31m错误: 必须使用 -n 指定会话名称\\033[0m\\n' >&2")
  lines.push('    return 1')
  lines.push('  fi')
  lines.push('')
  }
  lines.push('  if [[ -n "$_session_name" ]]; then')
  // Sanitize session name before embedding in OSC sequences (strip C0 controls + DEL).
  lines.push('    local _safe_session_name="$(printf \'%s\' "$_session_name" | LC_ALL=C tr -d \'\\000-\\037\\177\')"')
  lines.push("    printf '\\033]0;%s\\007' \"CX 🔸 $_safe_session_name\"")
  lines.push('  fi')
  lines.push('')
  lines.push('  local _opts=(')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`    ${quoteBashLikeLiteral(`${name}:${entry.name || entry.funcName}`)}`)
  }
  lines.push('  )')
  lines.push(`  prompt-select ${quoteBashLikeLiteral(promptTitle)} "\${_opts[@]}" || return 0`)
  lines.push('')
  lines.push('  case $REPLY in')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`    ${name})  ${name} "\${_remaining[@]}" ;;`)
  }
  lines.push('  esac')
  lines.push('}')
}

function writePassthroughFunction(lines: string[], config: CXLaunchItem, proxyFns: ProxyFunctionNames): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  (')
  if (config.useSystemProxy) {
    lines.push(`    ${proxyFns.proxyOn} || return 1`)
  } else {
    lines.push(`    ${proxyFns.proxyOff}`)
  }
  lines.push('    codex "$@"')
  lines.push('  )')
  lines.push('}')
}

function getEndpoint(provider: CXProvider, endpointId?: string): CXEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
