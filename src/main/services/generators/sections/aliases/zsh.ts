import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellAlias } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { assertSafeAliasName, quoteBashLikeLiteral } from '../../shell-syntax'

export class AliasesZshGenerator implements SectionGenerator<ShellAlias[]> {
  readonly sectionName = 'aliases'
  readonly shellType: ShellType = 'zsh'

  generate(data: ShellAlias[], _ctx: GenerateContext): string {
    const items = data.filter(
      (a) => a.enabled && (!a.shells || a.shells.length === 0 || a.shells.includes('zsh'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const a of items) {
      lines.push(`alias ${assertSafeAliasName(a.alias, a.description || a.id)}=${quoteBashLikeLiteral(a.command)}`)
    }
    return lines.join('\n')
  }
}
