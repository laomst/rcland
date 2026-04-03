import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellAlias } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class AliasesZshGenerator implements SectionGenerator<ShellAlias[]> {
  readonly sectionName = 'aliases'
  readonly shellType: ShellType = 'zsh'

  generate(data: ShellAlias[], ctx: GenerateContext): string {
    const items = data.filter(
      (a) => a.enabled && (!a.shells || a.shells.length === 0 || a.shells.includes('zsh'))
    )
    if (items.length === 0) return ''

    const lines: string[] = ['# === 别名 ===']
    for (const a of items) {
      if (a.description) lines.push(`# ${a.description}`)
      lines.push(`alias ${a.alias}='${a.command.replace(/'/g, "'\\''")}'`)
    }
    return lines.join('\n')
  }
}
