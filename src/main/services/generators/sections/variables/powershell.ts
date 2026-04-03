import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellVariable } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class VariablesPowerShellGenerator implements SectionGenerator<ShellVariable[]> {
  readonly sectionName = 'variables'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellVariable[], ctx: GenerateContext): string {
    const items = data.filter(
      (v) => v.enabled && (!v.shells || v.shells.length === 0 || v.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = ['# === 环境变量 ===']
    for (const v of items) {
      const raw = v.encrypted ? ctx.decrypt(v.value) : v.value
      const escaped = ctx.escapeValue(raw)
      if (v.description) lines.push(`# ${v.description}`)
      lines.push(`$env:${v.key} = '${escaped}'`)
    }
    return lines.join('\n')
  }
}
