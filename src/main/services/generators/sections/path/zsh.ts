import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class PathZshGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'zsh'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('zsh'))
    )
    if (items.length === 0) return ''

    const paths = items.map((e) => e.path).join(':')
    const lines: string[] = ['# === PATH 配置 ===']
    lines.push(`export PATH="${paths}:$PATH"`)
    return lines.join('\n')
  }
}
