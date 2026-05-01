import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'

export class PathZshGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'zsh'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('zsh'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []
    lines.push('typeset -a CUSTOM_PATHS')
    lines.push('CUSTOM_PATHS=(')

    for (const e of items) {
      lines.push(`  "${ctx.escapeValue(e.path)}"`)
    }

    lines.push(')')
    lines.push('')
    lines.push('typeset -g new_paths=""')
    lines.push('for path_entry in "${CUSTOM_PATHS[@]}"; do')
    lines.push('  if [[ -d "$path_entry" ]]; then')
    lines.push('    if [[ -n "$new_paths" ]]; then')
    lines.push('      new_paths="$new_paths:$path_entry"')
    lines.push('    else')
    lines.push('      new_paths="$path_entry"')
    lines.push('    fi')
    lines.push('  fi')
    lines.push('done')
    lines.push('')
    lines.push('if [[ -n "$new_paths" ]]; then')
    lines.push('  export _RCLAND_MANAGED_PATH="$new_paths"')
    lines.push('  PATH="$_RCLAND_MANAGED_PATH:$PATH"')
    lines.push('fi')
    lines.push('')
    lines.push('export PATH')

    return lines.join('\n')
  }
}
