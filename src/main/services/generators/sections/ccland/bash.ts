import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { LaunchItem, Provider, ProviderEndpoint } from '@shared/types'
import { getEndpointUrl } from '@shared/types'
import type { ShellType } from '@shared/shell'
import type { CCLandSectionData } from './zsh'
import { assertSafeEnvName, assertSafeShellName, quoteBashLikeLiteral } from '../../shell-syntax'

export class CCLandBashGenerator implements SectionGenerator<CCLandSectionData> {
  readonly sectionName = 'ccland'
  readonly shellType: ShellType = 'bash'

  generate(data: CCLandSectionData, ctx: GenerateContext): string {
    const { ccConfig, decryptedTokens } = data
    const lines: string[] = []

    // CC launch functions

    const providerMap = new Map(ccConfig.providers.map((p) => [p.id, p]))
    const enabledProviderIds = new Set(ccConfig.providers.filter((p) => p.enabled).map((p) => p.id))
    const enabledConfigs = ccConfig.launchItems.filter((c) => {
      if (!c.enabled) return false
      if (c.passthrough) return true
      return enabledProviderIds.has(c.providerId)
    })

    for (const config of enabledConfigs) {
      if (config.passthrough) {
        this.writePassthroughFunction(lines, config, ctx.proxyFunctionNames)
      } else {
        const provider = providerMap.get(config.providerId)
        if (!provider) continue
        this.writeFunction(lines, provider, config, decryptedTokens, ctx.proxyFunctionNames)
      }
    }

    // Main selector (always generated when configs exist)
    const entries = enabledConfigs.map((c) => ({
      funcName: assertSafeShellName(c.funcName, c.name || c.id),
      label: c.name || c.funcName
    }))
    if (entries.length > 0) {
      const selectorFuncName = assertSafeShellName(ccConfig.selector.funcName, 'selector')
      this.writeSelectorFunction(lines, selectorFuncName, ccConfig.selector.promptTitle, entries)
      if (ccConfig.selector.aliasEnabled !== false) {
        lines.push('')
        lines.push(`alias ${selectorFuncName}d='${selectorFuncName} --dangerously-skip-permissions'`)
      }
    }

    // local-only selector
    const ls = ccConfig.selector.localSelector
    if (ls?.enabled) {
      const localFuncName = assertSafeShellName(ls.funcName || 'ccl', 'local-selector')
      const localEntries = enabledConfigs
        .filter((c) => c.localOnly)
        .map((c) => ({
          funcName: assertSafeShellName(c.funcName, c.name || c.id),
          label: c.name || c.funcName
        }))
      if (localEntries.length > 0) {
        this.writeSelectorFunction(lines, localFuncName, ls.promptTitle || ccConfig.selector.promptTitle, localEntries)
      } else {
        lines.push('')
        lines.push(`${localFuncName}() { echo ${quoteBashLikeLiteral(`错误: 没有任何本机启动器,请在 RCLand 中将启动项标记为「仅本机」`)} >&2; return 1; }`)
      }
      if (ls.aliasEnabled !== false) {
        lines.push('')
        lines.push(`alias ${localFuncName}d='${localFuncName} --dangerously-skip-permissions'`)
      }
    }

    // kanban function
    if (data.ccConfig.selector.kanban?.enabled) {
      const kanbanFuncName = data.ccConfig.selector.kanban.funcName || 'show-cc-usage'
      lines.push('')
      lines.push(`${kanbanFuncName}() {`)
      lines.push('  if [ -z "$CCLAND_CC_TOKEN_KANBAN" ]; then')
      lines.push('    echo "\\033[31m错误：未配置看板 URL，请在供应商管理中设置\\033[0m" >&2')
      lines.push('    return 1')
      lines.push('  fi')
      lines.push('  (open "$CCLAND_CC_TOKEN_KANBAN" 2>/dev/null || xdg-open "$CCLAND_CC_TOKEN_KANBAN" 2>/dev/null) &')
      lines.push('}')
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
    lines.push('  local _opts=(')
    for (const entry of entries) {
      lines.push(`      ${quoteBashLikeLiteral(`${entry.funcName}:${entry.label}`)}`)
    }
    lines.push('  )')
    lines.push(`  prompt-select ${quoteBashLikeLiteral(promptTitle)} "\${_opts[@]}" || return 0`)
    lines.push('')
    lines.push('  case $REPLY in')
    for (const entry of entries) {
      lines.push(`    ${entry.funcName})  ${entry.funcName} "\${@}" ;;`)
    }
    lines.push('  esac')
    lines.push('}')
  }

  private writeFunction(
    lines: string[],
    provider: Provider,
    config: LaunchItem,
    tokens: Map<string, string>,
    proxyFns: { proxyOn: string; proxyOff: string }
  ): void {
    lines.push('')

    const tokenVal = tokens.get(`token:${config.id}`)
    if (!tokenVal) {
      const funcName = assertSafeShellName(config.funcName, config.name || config.id)
      lines.push(`${funcName}() { echo ${quoteBashLikeLiteral(`错误: 启动项 ${funcName} 未设置 Token.请在 RCLand 中配置`)} >&2; return 1; }`)
      return
    }

    const funcName = assertSafeShellName(config.funcName, config.name || config.id)
    const endpoint = getEndpoint(provider, config.endpointId)
    lines.push(`${funcName}() {`)
    lines.push('  (')

    if (endpoint?.useSystemProxy) {
      lines.push(`    ${proxyFns.proxyOn} || return 1`)
    } else {
      lines.push(`    ${proxyFns.proxyOff}`)
    }

    lines.push(`    export ANTHROPIC_AUTH_TOKEN=${quoteBashLikeLiteral(tokenVal)}`)
    lines.push(`    export ANTHROPIC_BASE_URL=${quoteBashLikeLiteral(getEndpointUrl(provider, config.endpointId))}`)

    if (provider.kanbanUrl) {
      lines.push(`    export CCLAND_CC_TOKEN_KANBAN=${quoteBashLikeLiteral(provider.kanbanUrl)}`)
    }

    for (const key of Object.keys(config.envVars)) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        lines.push(`    export ${assertSafeEnvName(key, funcName)}=${quoteBashLikeLiteral(setting.value)}`)
      }
    }

    lines.push('    claude "$@"')
    lines.push('  )')
    lines.push('}')
  }

  private writePassthroughFunction(
    lines: string[],
    config: LaunchItem,
    proxyFns: { proxyOn: string; proxyOff: string }
  ): void {
    lines.push('')
    const funcName = assertSafeShellName(config.funcName, config.name || config.id)
    lines.push(`${funcName}() {`)
    lines.push('  (')

    if (config.useSystemProxy) {
      lines.push(`    ${proxyFns.proxyOn} || return 1`)
    } else {
      lines.push(`    ${proxyFns.proxyOff}`)
    }

    lines.push('    claude "$@"')
    lines.push('  )')
    lines.push('}')
  }
}

function getEndpoint(provider: Provider, endpointId?: string): ProviderEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((endpoint) => endpoint.id === endpointId) ?? provider.endpoints[0]
}
