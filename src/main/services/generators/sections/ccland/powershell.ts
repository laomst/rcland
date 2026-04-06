import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ConfigSet, Provider } from '@shared/types'
import { getEndpointUrl, CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import type { ShellType } from '@shared/shell'
import type { CCLandSectionData } from './zsh'

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
      this.writeFunction(lines, provider, config, decryptedTokens)
    }

    if (ccConfig.selector.enabled) {
      const entries = enabledConfigs.map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
      if (entries.length > 0) {
        this.writeSelectorFunction(lines, ccConfig.selector.funcName, ccConfig.selector.promptTitle, entries)
        lines.push('')
        lines.push(`function ccd { ${ccConfig.selector.funcName} --dangerously-skip-permissions @args }`)
      }

      // ccl: local-only selector
      const localEntries = enabledConfigs
        .filter((c) => c.localOnly)
        .map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
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
    lines.push('    $opts = @(')
    for (const entry of entries) {
      lines.push(`        "${entry.funcName}:${entry.label}"`)
    }
    lines.push('    )')
    lines.push(`    prompt-select "${promptTitle}" $opts`)
    lines.push('')
    lines.push('    switch ($REPLY) {')
    for (const entry of entries) {
      lines.push(`        '${entry.funcName}'  { ${entry.funcName} @args ; break }`)
    }
    lines.push('    }')
    lines.push('}')
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
      lines.push(`    Write-Error "配置项 ${config.funcName} 未设置 Token.请在 RCLand 中配置"`)
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
