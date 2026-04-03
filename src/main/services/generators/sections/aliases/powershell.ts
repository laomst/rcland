import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellAlias } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class AliasesPowerShellGenerator implements SectionGenerator<ShellAlias[]> {
  readonly sectionName = 'aliases'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellAlias[], ctx: GenerateContext): string {
    const items = data.filter(
      (a) => a.enabled && (!a.shells || a.shells.length === 0 || a.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = ['# === 别名 ===']
    for (const a of items) {
      if (a.description) lines.push(`# ${a.description}`)
      // PowerShell Set-Alias only works for simple command→command mappings
      // For commands with arguments, use a function wrapper
      if (a.command.includes(' ')) {
        lines.push(`function ${a.alias} { ${a.command} @args }`)
      } else {
        lines.push(`Set-Alias -Name ${a.alias} -Value ${a.command}`)
      }
    }
    return lines.join('\n')
  }
}
