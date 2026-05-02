import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { quotePowerShellLiteral } from '../../shell-syntax'
import { resolvePathVarRefs, topoSortPathVariables } from '@shared/var-refs'
import { assertSafeEnvName } from '../../shell-syntax'

export class PathPowerShellGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'powershell'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []

    // Export path variables as environment variables (topologically sorted)
    const enabledPathVars = ctx.pathVariables.filter((v) => v.enabled && v.key)
    if (enabledPathVars.length > 0) {
      const sorted = topoSortPathVariables(enabledPathVars)
      for (const v of sorted) {
        const resolved = resolvePathVarRefs(v.value, ctx.pathVariables)
        lines.push(`$env:${assertSafeEnvName(v.key, v.id)} = ${quotePowerShellLiteral(resolved)}`)
      }
    }

    lines.push('$customPaths = @(')

    for (const e of items) {
      const resolved = resolvePathVarRefs(e.path, ctx.pathVariables)
      lines.push(`    @{Path=${quotePowerShellLiteral(resolved)}; Condition=''}`)
    }

    lines.push(')')
    lines.push('')
    lines.push('$newPaths = @()')
    lines.push('foreach ($entry in $customPaths) {')
    lines.push('    if (Test-Path -Path $entry.Path -PathType Container) {')
    lines.push('        $newPaths += $entry.Path')
    lines.push('    }')
    lines.push('}')
    lines.push('')
    lines.push('if ($newPaths.Count -gt 0) {')
    lines.push('    $env:_RCLAND_MANAGED_PATH = $newPaths -join ";"')
    lines.push('    $env:PATH = $env:_RCLAND_MANAGED_PATH + ";" + $env:PATH')
    lines.push('}')

    return lines.join('\n')
  }
}
