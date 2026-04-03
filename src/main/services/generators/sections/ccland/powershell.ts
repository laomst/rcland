import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ConfigSet, Provider } from '../../../../../shared/types'
import { getEndpointUrl, CLAUDE_ENV_VAR_KEYS } from '../../../../../shared/types'
import type { ShellType } from '../../../../../shared/shell'
import type { CClandSectionData } from './zsh'

export class CClandPowerShellGenerator implements SectionGenerator<CClandSectionData> {
  readonly sectionName = 'ccland'
  readonly shellType: ShellType = 'powershell'

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
        lines.push(`function ${ccConfig.selector.funcName} {`)
        lines.push('    $opts = @(')
        for (const entry of entries) {
          lines.push(`        "${entry.funcName}:${entry.label}"`)
        }
        lines.push('    )')
        lines.push(`    prompt-select "${ccConfig.selector.promptTitle}" $opts`)
        lines.push('')
        lines.push('    switch ($REPLY) {')
        for (const entry of entries) {
          lines.push(`        '${entry.funcName}'  { ${entry.funcName} @args ; break }`)
        }
        lines.push('    }')
        lines.push('}')
        lines.push('')
        lines.push(`function ccd { ${ccConfig.selector.funcName} --dangerously-skip-permissions @args }`)
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
      lines.push(`function ${config.funcName} {`)
      lines.push(`    Write-Error "配置项 ${config.funcName} 未设置 Token.请在 CCland 中配置"`)
      lines.push('}')
      return
    }

    lines.push(`function ${config.funcName} {`)
    lines.push(`    $env:ANTHROPIC_AUTH_TOKEN = "${tokenVal}"`)
    lines.push(`    $env:ANTHROPIC_BASE_URL = "${getEndpointUrl(provider, config.endpointId)}"`)

    for (const key of CLAUDE_ENV_VAR_KEYS) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        lines.push(`    $env:${key} = "${setting.value}"`)
      }
    }

    lines.push('    claude @args')
    lines.push('}')
  }
}
