import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { CCLaunchData, ConfigSet, Provider, ProviderEndpoint } from '@shared/types'
import { getEndpointUrl, CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import type { ShellType } from '@shared/shell'
import { assertSafeEnvName, assertSafeShellName, quoteBashLikeLiteral } from '../../shell-syntax'
import {
  getSystemProxyEnvNames,
  SYSTEM_PROXY_ENV_NAMES,
  type SystemProxyConfig,
} from '@shared/system-proxy'

/** Data bundle for CCLand section */
export interface CCLandSectionData {
  ccConfig: CCLaunchData
  decryptedTokens: Map<string, string>
  systemProxy: SystemProxyConfig
}

export class CCLandZshGenerator implements SectionGenerator<CCLandSectionData> {
  readonly sectionName = 'ccland'
  readonly shellType: ShellType = 'zsh'

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
        lines.push(`alias ccd='${selectorFuncName} --dangerously-skip-permissions'`)
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
        lines.push(`alias ccld='ccl --dangerously-skip-permissions'`)
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
    lines.push(`${funcName}() {`)
    lines.push('  local session_name=""')
    lines.push('  local remaining_args=()')
    lines.push('')
    lines.push('  while [[ $# -gt 0 ]]; do')
    lines.push('    case "$1" in')
    lines.push('      -n)')
    lines.push('        if [[ $# -lt 2 || -z "$2" ]]; then')
    lines.push("          printf '\\033[31m错误: -n 需要提供会话名称，例如: cc -n 重构认证模块\\033[0m\\n' >&2")
    lines.push('          return 1')
    lines.push('        fi')
    lines.push('        session_name="$2"; shift 2')
    lines.push('        ;;')
    lines.push('      -n*)')
    lines.push('        session_name="${1#-n}"; shift')
    lines.push('        ;;')
    lines.push('      *)')
    lines.push('        remaining_args+=("$1"); shift')
    lines.push('        ;;')
    lines.push('    esac')
    lines.push('  done')
    lines.push('')
    lines.push('  if [[ -z "$session_name" ]]; then')
    lines.push("    printf '\\033[31m错误: 必须使用 -n 指定会话名称，例如: cc -n 重构认证模块\\033[0m\\n' >&2")
    lines.push('    return 1')
    lines.push('  fi')
    lines.push('')
    lines.push('  set_main_task_name "CC 🔸 $session_name"')
    lines.push('')
    lines.push('  local _opts=(')
    for (const entry of entries) {
      lines.push(`      ${quoteBashLikeLiteral(`${entry.funcName}:${entry.label}`)}`)
    }
    lines.push('  )')
    lines.push(`  prompt-select ${quoteBashLikeLiteral(promptTitle)} "\${_opts[@]}" || return 0`)
    lines.push('')
    lines.push('  case $REPLY in')
    for (const entry of entries) {
      lines.push(`    ${entry.funcName})  ${entry.funcName} -n "$session_name" "\${remaining_args[@]}" ;;`)
    }
    lines.push('  esac')
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
      lines.push(`${funcName}() { echo ${quoteBashLikeLiteral(`错误: 配置项 ${funcName} 未设置 Token，请在 RCLand 中配置`)} >&2; return 1; }`)
      return
    }

    const funcName = assertSafeShellName(config.funcName, config.name || config.id)
    const endpoint = getEndpoint(provider, config.endpointId)
    lines.push(`${funcName}() {`)
    lines.push('  local _sn=""')
    lines.push('  local _ra=()')
    lines.push('  while [[ $# -gt 0 ]]; do')
    lines.push('    case "$1" in')
    lines.push('      -n)')
    lines.push('        if [[ $# -lt 2 || -z "$2" ]]; then')
    lines.push("          printf '\\033[31m错误: -n 需要提供会话名称\\033[0m\\n' >&2")
    lines.push('          return 1')
    lines.push('        fi')
    lines.push('        _sn="$2"; shift 2')
    lines.push('        ;;')
    lines.push('      -n*)')
    lines.push('        _sn="${1#-n}"; shift')
    lines.push('        ;;')
    lines.push('      *)')
    lines.push('        _ra+=("$1"); shift')
    lines.push('        ;;')
    lines.push('    esac')
    lines.push('  done')
    lines.push('  if [[ -z "$_sn" ]]; then')
    lines.push("    printf '\\033[31m错误: 必须使用 -n 指定会话名称\\033[0m\\n' >&2")
    lines.push('    return 1')
    lines.push('  fi')
    lines.push('  set_main_task_name "CC 🔸 $_sn"')
    lines.push(`  env ${buildBashLikeProxyArgs(endpoint, systemProxy).join(' ')} \\`)
    lines.push(`  ANTHROPIC_AUTH_TOKEN=${quoteBashLikeLiteral(tokenVal)} \\`)
    lines.push(`  ANTHROPIC_BASE_URL=${quoteBashLikeLiteral(getEndpointUrl(provider, config.endpointId))} \\`)

    for (const key of CLAUDE_ENV_VAR_KEYS) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        lines.push(`  ${assertSafeEnvName(key, funcName)}=${quoteBashLikeLiteral(setting.value)} \\`)
      }
    }

    lines.push('  claude -n "$_sn" "${_ra[@]}"')
    lines.push('}')
  }
}

function getEndpoint(provider: Provider, endpointId?: string): ProviderEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((endpoint) => endpoint.id === endpointId) ?? provider.endpoints[0]
}

function buildBashLikeProxyArgs(endpoint: ProviderEndpoint | null, systemProxy: SystemProxyConfig): string[] {
  if (!endpoint?.useSystemProxy) {
    return SYSTEM_PROXY_ENV_NAMES.flatMap((key) => ['-u', key])
  }

  return systemProxy.proxyEnvVars
    .filter((item) => item.value.trim())
    .flatMap(({ type, value }) => getSystemProxyEnvNames(type).map((key) => `${key}=${quoteBashLikeLiteral(value)}`))
}
