import { BaseShellGenerator, type DecryptedValues } from './base'
import type { CCLaunchData, ConfigSet, Provider } from '../../../shared/types'
import { getEndpointUrl } from '../../../shared/types'
import { CLAUDE_ENV_VAR_KEYS } from '../../../shared/types'
import type { ShellType } from '../../../shared/shell'

export class ZshGenerator extends BaseShellGenerator {
  readonly shellType: ShellType = 'zsh'
  readonly sourceMarkers = {
    begin: '# >>> CCland >>>',
    end:   '# <<< CCland <<<'
  }

  generate(data: CCLaunchData, values: DecryptedValues): string {
    const lines: string[] = []

    lines.push('#!/bin/zsh')
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
      const entries = enabledConfigs.map((c) => ({ funcName: c.funcName, label: c.name || c.description || c.funcName }))
      if (entries.length > 0) {
        lines.push(this.separator('Selector'))
        lines.push('')

        lines.push(`${data.selector.funcName}() {`)
        lines.push('  local _opts=(')
        for (const entry of entries) {
          lines.push(`      "${entry.funcName}:${entry.label}"`)
        }
        lines.push('  )')
        lines.push(`  prompt-select "${data.selector.promptTitle}" "\${_opts[@]}" || return 0`)
        lines.push('')
        lines.push('  case $REPLY in')
        for (const entry of entries) {
          lines.push(`    ${entry.funcName})  ${entry.funcName} "$@" ;;`)
        }
        lines.push('  esac')
        lines.push('}')
      }
    }

    if (data.selector.enabled && enabledConfigs.length > 0) {
      lines.push(this.separator('Aliases'))
      lines.push('')
      lines.push(`alias ccd='${data.selector.funcName} --dangerously-skip-permissions'`)
    }

    lines.push('')
    return lines.join('\n')
  }

  generateSourceLine(outputPath: string): string {
    return [this.sourceMarkers.begin, `source ${outputPath}`, this.sourceMarkers.end].join('\n')
  }

  private writeFunction(
    lines: string[],
    provider: Provider,
    config: ConfigSet,
    values: DecryptedValues
  ): void {
    lines.push('')
    if (config.description) lines.push(`# ${config.description}`)

    const tokenVal = values.get(`token:${config.id}`)
    if (!tokenVal) {
      lines.push(`${config.funcName}() { echo "\\033[31m错误: 配置项 ${config.funcName} 未设置 Token，请在 CCland 中配置\\033[0m" >&2; return 1; }`)
      return
    }

    lines.push(`${config.funcName}() {`)

    const envLines: string[] = []

    envLines.push(`  ANTHROPIC_AUTH_TOKEN="${tokenVal}" \\`)

    const urlVal = getEndpointUrl(provider, config.endpointId)
    envLines.push(`  ANTHROPIC_BASE_URL="${urlVal}" \\`)

    for (const key of CLAUDE_ENV_VAR_KEYS) {
      const setting = config.envVars[key]
      if (setting && setting.enabled && setting.value) {
        envLines.push(`  ${key}=${setting.value} \\`)
      }
    }

    lines.push(...envLines)
    lines.push('  claude "$@"')
    lines.push('}')
  }
}
