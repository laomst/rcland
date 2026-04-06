import { BaseShellGenerator, type DecryptedValues } from './base'
import type { CCLaunchData, ConfigSet, Provider } from '@shared/types'
import { getEndpointUrl } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import type { ShellType } from '@shared/shell'

export class PowerShellGenerator extends BaseShellGenerator {
  readonly shellType: ShellType = 'powershell'
  readonly sourceMarkers = {
    begin: '# >>> RCLand >>>',
    end:   '# <<< RCLand <<<'
  }

  generate(data: CCLaunchData, values: DecryptedValues): string {
    const lines: string[] = []

    lines.push('# PowerShell')
    lines.push(this.header())

    const providerMap = new Map(data.providers.map((p) => [p.id, p]))
    const enabledProviderIds = new Set(data.providers.filter((p) => p.enabled).map((p) => p.id))
    const enabledConfigs = data.configs.filter((c) => c.enabled && enabledProviderIds.has(c.providerId))

    if (enabledConfigs.length > 0) {
      lines.push(this.separator('Launcher Functions'))

      for (const config of enabledConfigs) {
        const provider = providerMap.get(config.providerId)
        if (provider) this.writeFunction(lines, provider, config, values)
      }
    }

    if (data.selector.enabled) {
      const entries = enabledConfigs.map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
      if (entries.length > 0) {
        lines.push(this.separator('Selector'))
        this.writeSelectorFunction(lines, data.selector.funcName, data.selector.promptTitle, entries)
      }

      // ccl: local-only selector
      const localEntries = enabledConfigs
        .filter((c) => c.localOnly)
        .map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
      if (localEntries.length > 0) {
        this.writeSelectorFunction(lines, 'ccl', data.selector.promptTitle, localEntries)
      }
    }

    if (data.selector.enabled && enabledConfigs.length > 0) {
      lines.push(this.separator('Aliases'))
      lines.push('')
      lines.push(`function ccd { ${data.selector.funcName} --dangerously-skip-permissions @args }`)

      const hasLocal = enabledConfigs.some((c) => c.localOnly)
      if (hasLocal) {
        lines.push(`function ccld { ccl --dangerously-skip-permissions @args }`)
      }
    }

    lines.push('')
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

  generateSourceLine(outputPath: string): string {
    return [this.sourceMarkers.begin, `. "${outputPath}"`, this.sourceMarkers.end].join('\n')
  }

  private writeFunction(
    lines: string[],
    provider: Provider,
    config: ConfigSet,
    values: DecryptedValues
  ): void {
    lines.push('')
    if (config.name) lines.push(`# ${config.name}`)

    const tokenVal = values.get(`token:${config.id}`)
    if (!tokenVal) {
      lines.push(`function ${config.funcName} {`)
      lines.push(`    Write-Error "配置项 ${config.funcName} 未设置 Token，请在 RCLand 中配置"`)
      lines.push('}')
      return
    }

    lines.push(`function ${config.funcName} {`)

    lines.push(`    $env:ANTHROPIC_AUTH_TOKEN = "${tokenVal}"`)

    const urlVal = getEndpointUrl(provider, config.endpointId)
    lines.push(`    $env:ANTHROPIC_BASE_URL = "${urlVal}"`)

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
