import type { CXLandData, CXProvider, CXConfigSet, CXEndpoint } from '@shared/types'
import { getCXEndpointUrl } from '@shared/types'
import { SYSTEM_PROXY_ENV_NAMES } from '@shared/system-proxy'
import { quoteBashLikeLiteral, assertSafeShellName } from '../../shell-syntax'
import { sanitizeCodexProviderId, buildBashCodexConfigArg } from './codex-args'

/**
 * Build bash/zsh shell content for all enabled CXConfigSets and optional selector.
 *
 * Key differences from CC (Claude Code):
 * - Uses `codex` command, NOT `claude`
 * - Uses `-c key="value"` dynamic config, NOT environment variable templates
 * - `-n` session name parsed for OSC terminal title only (not passed to codex)
 * - `OPENAI_API_KEY` env var, not `ANTHROPIC_API_KEY`
 * - `cxd` alias uses `--dangerously-bypass-approvals-and-sandbox`
 */
export function buildBashLikeCXContent(
  data: CXLandData,
  decryptedTokens: Map<string, string>
): string {
  const lines: string[] = []

  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabledConfigs = data.configs.filter((c) => c.enabled)

  for (const config of enabledConfigs) {
    const provider = providerMap.get(config.providerId)
    if (!provider) {
      writeErrorStub(lines, config, `错误: 配置项 ${config.funcName} 的 Provider 不存在`)
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
    lines.push(`alias ${aliasName}='${selectorFuncName} --dangerously-bypass-approvals-and-sandbox'`)
  }

  return lines.join('\n')
}

function writeErrorStub(lines: string[], config: CXConfigSet, message: string): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`${funcName}() { echo ${quoteBashLikeLiteral(message)} >&2; return 1; }`)
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
    writeErrorStub(lines, config, `错误: 配置项 ${funcName} 未设置 Token.请在 RCLand 中配置`)
    return
  }

  const endpoint = getEndpoint(provider, config.endpointId)
  const baseUrl = getCXEndpointUrl(provider, config.endpointId)
  if (!baseUrl) {
    writeErrorStub(lines, config, `错误: 配置项 ${funcName} 的 Endpoint URL 为空`)
    return
  }

  const providerId = sanitizeCodexProviderId(funcName)

  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  local _sn=""')
  lines.push('  local _filtered=()')
  lines.push('  while [[ $# -gt 0 ]]; do')
  lines.push('    case "$1" in')
  lines.push('      -n)')
  lines.push('        if [[ $# -ge 2 && -n "$2" ]]; then')
  lines.push('          _sn="$2"; shift 2')
  lines.push('        else')
  lines.push('          _sn="${1#-n}"; shift')
  lines.push('        fi')
  lines.push('        ;;')
  lines.push('      -n*)')
  lines.push('        _sn="${1#-n}"; shift')
  lines.push('        ;;')
  lines.push('      *)')
  lines.push('        _filtered+=("$1"); shift')
  lines.push('        ;;')
  lines.push('    esac')
  lines.push('  done')
  lines.push('  if [[ -n "$_sn" ]]; then')
  lines.push("    printf '\\033]0;%s\\007' \"CX 🔸 $_sn\"")
  lines.push('  fi')
  lines.push('  (')

  if (endpoint?.useSystemProxy) {
    lines.push('    local _proxy_lines')
    lines.push('    _proxy_lines="$(_rcland_read_os_proxy)"')
    lines.push('    if [[ -z "$_proxy_lines" ]]; then')
    lines.push(`      echo ${quoteBashLikeLiteral(`错误: 配置项 ${funcName} 启用了系统代理但未检测到系统代理设置`)} >&2`)
    lines.push('      return 1')
    lines.push('    fi')
    lines.push('    eval "$_proxy_lines"')
  } else {
    lines.push(`    unset ${SYSTEM_PROXY_ENV_NAMES.join(' ')}`)
  }

  lines.push(`    OPENAI_API_KEY=${quoteBashLikeLiteral(tokenVal)}`)
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
  entries: CXConfigSet[],
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
  if (requireN) {
  lines.push('        if [[ $# -lt 2 || -z "$2" ]]; then')
  lines.push("          printf '\\033[31m错误: -n 需要提供会话名称\\033[0m\\n' >&2")
  lines.push('          return 1')
  lines.push('        fi')
  }
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
  lines.push("    printf '\\033]0;%s\\007' \"CX 🔸 $_session_name\"")
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

function getEndpoint(provider: CXProvider, endpointId?: string): CXEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
