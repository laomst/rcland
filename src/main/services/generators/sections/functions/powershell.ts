import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellFunction } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'

export class FunctionsPowerShellGenerator implements SectionGenerator<ShellFunction[]> {
  readonly sectionName = 'functions'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellFunction[], _ctx: GenerateContext): string {
    const items = data.filter((f) => f.enabled && f.body.powershell)
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const fn of items) {
      lines.push(fn.body.powershell!)
      lines.push('')
    }
    return lines.join('\n')
  }
}
