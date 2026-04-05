import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellFunction } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'

export class FunctionsZshGenerator implements SectionGenerator<ShellFunction[]> {
  readonly sectionName = 'functions'
  readonly shellType: ShellType = 'zsh'

  generate(data: ShellFunction[], ctx: GenerateContext): string {
    const items = data.filter((f) => f.enabled && (f.body.zsh || f.body.bash))
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const fn of items) {
      const body = fn.body.zsh ?? fn.body.bash ?? ''
      lines.push(body)
      lines.push('')
    }
    return lines.join('\n')
  }
}
