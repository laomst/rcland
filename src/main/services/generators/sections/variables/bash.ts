import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellVariable } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'

export class VariablesBashGenerator implements SectionGenerator<ShellVariable[]> {
  readonly sectionName = 'variables'
  readonly shellType: ShellType = 'bash'

  generate(data: ShellVariable[], ctx: GenerateContext): string {
    const items = data.filter(
      (v) => v.enabled && (!v.shells || v.shells.length === 0 || v.shells.includes('bash'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const v of items) {
      const raw = v.encrypted ? ctx.decrypt(v.value) : v.value
      const escaped = ctx.escapeValue(raw)
      lines.push(`export ${v.key}="${escaped}"`)
    }
    return lines.join('\n')
  }
}
