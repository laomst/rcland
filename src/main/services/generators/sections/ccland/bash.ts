import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { CCLaunchData, ConfigSet, Provider } from '../../../../../shared/types'
import { getEndpointUrl, CLAUDE_ENV_VAR_KEYS } from '../../../../../shared/types'
import type { ShellType } from '../../../../../shared/shell'
import type { CClandSectionData } from './zsh'

export class CClandBashGenerator implements SectionGenerator<CClandSectionData> {
  readonly sectionName = 'ccland'
  readonly shellType: ShellType = 'bash'

  generate(data: CClandSectionData, ctx: GenerateContext): string {
    const { ccConfig, decryptedTokens } = data
    const lines: string[] = []

    lines.push('# === Claude Code 配置 ===')
    lines.push('# >>> CCland CC >>>')

    const providerMap = new Map(ccConfig.providers.map((p) => [p.id, p]))
    const enabledProviderIds = new Set(ccConfig.providers.filter((p) => p.enabled).map((p) => p.id))
    const enabledConfigs = ccConfig.configs.filter((c) => c.enabled && enabledProviderIds.has(c.providerId))

    for (const config of enabledConfigs) {
      const provider = providerMap.get(config.providerId)
      if (!provider) continue
      this.writeFunction(lines, provider, config, decryptedTokens)
    }

    if (ccConfig.selector.enabled) {
      const entries = enabledConfigs.map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
      if (entries.length > 0) {
        lines.push('')
        lines.push(`${ccConfig.selector.funcName}() {`)
        lines.push('  local _opts=(')
        for (const entry of entries) {
          lines.push(`      "${entry.funcName}:${entry.label}"`)
        }
        lines.push('  )')
        lines.push(`  prompt-select "${ccConfig.selector.promptTitle}" "\${_opts[@]}" || return 0`)
        lines.push('')
        lines.push('  case $REPLY in')
        for (const entry of entries) {
          lines.push(`    ${entry.funcName})  ${entry.funcName} "$@" ;;`)
        }
        lines.push('  esac')
        lines.push('}')
        lines.push('')
        lines.push(`alias ccd='${ccConfig.selector.funcName} --dangerously-skip-permissions'`)
      }
    }

    lines.push('# <<< CCland CC <<<')
    return lines.join('\n')
  }

  private writeFunction(
    lines: string[],
    provider: Provider,
    config: ConfigSet,
    tokens: Map<string, string>
  ): void {
    lines.push('')

    const tokenVal = tokens.get(`token:${config.id}`)
    if (!tokenVal) {
      lines.push(`${config.funcName}() { echo "\\033[31m错误: 配置项 ${config.funcName} 未设置 Token.请在 CCland 中配置\\033[0m" >&2; return 1; }`)
      return
    }

    lines.push(`${config.funcName}() {`)
    lines.push(`  ANTHROPIC_AUTH_TOKEN="${tokenVal}" \\`)
    lines.push(`  ANTHROPIC_BASE_URL="${getEndpointUrl(provider, config.endpointId)}" \\`)

    for (const key of CLAUDE_ENV_VAR_KEYS) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        lines.push(`  ${key}=${setting.value} \\`)
      }
    }

    lines.push('  claude "$@"')
    lines.push('}')
  }
}
