import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class PathPowerShellGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'powershell'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = ['# === PATH 配置 ===']
    for (const entry of items) {
      lines.push(`$env:PATH = '${ctx.escapeValue(entry.path)}' + ';' + $env:PATH`)
    }
    return lines.join('\n')
  }
}
