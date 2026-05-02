import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { resolvePathVarRefs, topoSortPathVariables } from '@shared/var-refs'
import { assertSafeEnvName } from '../../shell-syntax'

export class PathBashGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'bash'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('bash'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []

    // Export path variables as environment variables (topologically sorted)
    const enabledPathVars = ctx.pathVariables.filter((v) => v.enabled && v.key)
    if (enabledPathVars.length > 0) {
      const sorted = topoSortPathVariables(enabledPathVars)
      for (const v of sorted) {
        const resolved = resolvePathVarRefs(v.value, ctx.pathVariables)
        lines.push(`export ${assertSafeEnvName(v.key, v.id)}="${ctx.escapeValue(resolved)}"`)
      }
    }

    lines.push('CUSTOM_PATHS=()')

    for (const e of items) {
      const resolved = resolvePathVarRefs(e.path, ctx.pathVariables)
      lines.push(`CUSTOM_PATHS+=("${ctx.escapeValue(resolved)}")`)
    }

    lines.push('')
    lines.push('new_paths=""')
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
