import { BaseShellGenerator, type DecryptedValues } from './base'
import type { CCLaunchData, ConfigSet, Provider } from '@shared/types'
import { getEndpointUrl } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import type { ShellType } from '@shared/shell'

export class ZshGenerator extends BaseShellGenerator {
  readonly shellType: ShellType = 'zsh'
  readonly sourceMarkers = {
    begin: '# >>> RCLand >>>',
    end:   '# <<< RCLand <<<'
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

    // Main selector (always generated when configs exist)
    if (enabledConfigs.length > 0) {
      const entries = enabledConfigs.map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
      if (entries.length > 0) {
        lines.push(this.separator('Selector'))
        this.writeSelectorFunction(lines, data.selector.funcName, data.selector.promptTitle, entries)
      }

      lines.push(this.separator('Aliases'))
      lines.push('')
      lines.push(`alias ${data.selector.funcName}d='${data.selector.funcName} --dangerously-skip-permissions'`)

      // local-only selector
      const ls = data.selector.localSelector
      if (ls?.enabled) {
        const localEntries = enabledConfigs
          .filter((c) => c.localOnly)
          .map((c) => ({ funcName: c.funcName, label: c.name || c.funcName }))
        if (localEntries.length > 0) {
          const localFuncName = ls.funcName || 'ccl'
          this.writeSelectorFunction(lines, localFuncName, ls.promptTitle || data.selector.promptTitle, localEntries)
          if (ls.aliasEnabled !== false) {
            lines.push(`alias ${localFuncName}d='${localFuncName} --dangerously-skip-permissions'`)
          }
        }
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
    lines.push(`${funcName}() {`)
    lines.push('  local _opts=(')
    for (const entry of entries) {
      lines.push(`      "${entry.funcName}:${entry.label}"`)
    }
    lines.push('  )')
    lines.push(`  prompt-select "${promptTitle}" "\${_opts[@]}" || return 0`)
    lines.push('')
    lines.push('  case $REPLY in')
    for (const entry of entries) {
      lines.push(`    ${entry.funcName})  ${entry.funcName} "$@" ;;`)
    }
    lines.push('  esac')
    lines.push('}')
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
    if (config.name) lines.push(`# ${config.name}`)

    const tokenVal = values.get(`token:${config.id}`)
    if (!tokenVal) {
      lines.push(`${config.funcName}() { echo "\\033[31m错误: 配置项 ${config.funcName} 未设置 Token，请在 RCLand 中配置\\033[0m" >&2; return 1; }`)
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
