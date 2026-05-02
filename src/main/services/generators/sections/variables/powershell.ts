import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellVariable } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { assertSafeEnvName } from '../../shell-syntax'
import { resolveVarRefs, topoSortVariables } from '@shared/var-refs'

export class VariablesPowerShellGenerator implements SectionGenerator<ShellVariable[]> {
  readonly sectionName = 'variables'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellVariable[], ctx: GenerateContext): string {
    const filtered = data.filter(
      (v) => v.enabled && (!v.shells || v.shells.length === 0 || v.shells.includes('powershell'))
    )
    const items = topoSortVariables(filtered)
    if (items.length === 0) return ''

    const lines: string[] = []
    for (const v of items) {
      const raw = v.encrypted ? ctx.decrypt(v.value) : v.value
      const resolved = resolveVarRefs(raw, 'powershell')

      if (resolved.includes('$env:')) {
        // Use string concatenation: 'prefix' + $env:FOO + 'suffix'
        const parts = resolved.split(/(\$env:[A-Za-z_][A-Za-z0-9_]*)/)
        const expr = parts
          .map((part) => {
            if (part.startsWith('$env:')) return part
            return `'${part.replace(/'/g, "''")}'`
          })
          .join(' + ')
        lines.push(`$env:${assertSafeEnvName(v.key, v.description || v.id)} = ${expr}`)
      } else {
        const escaped = ctx.escapeValue(resolved)
        lines.push(`$env:${assertSafeEnvName(v.key, v.description || v.id)} = '${escaped}'`)
      }
    }
    return lines.join('\n')
  }
}
