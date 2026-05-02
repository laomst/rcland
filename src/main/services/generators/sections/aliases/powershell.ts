import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellAlias } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { assertSafeAliasName, quotePowerShellLiteral } from '../../shell-syntax'

export class AliasesPowerShellGenerator implements SectionGenerator<ShellAlias[]> {
  readonly sectionName = 'aliases'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellAlias[], _ctx: GenerateContext): string {
    const items = data.filter(
      (a) => a.enabled && (!a.shells || a.shells.length === 0 || a.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const a of items) {
      const alias = assertSafeAliasName(a.alias, a.description || a.id)
      // PowerShell Set-Alias only works for simple command→command mappings
      // For commands with arguments, use a function wrapper
      if (a.command.includes(' ')) {
        lines.push(`function ${alias} { ${a.command} @args }`)
      } else {
        lines.push(`Set-Alias -Name ${quotePowerShellLiteral(alias)} -Value ${quotePowerShellLiteral(a.command)}`)
      }
    }
    return lines.join('\n')
  }
}
