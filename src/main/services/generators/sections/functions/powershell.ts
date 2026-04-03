import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellFunction } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class FunctionsPowerShellGenerator implements SectionGenerator<ShellFunction[]> {
  readonly sectionName = 'functions'
  readonly shellType: ShellType = 'powershell'

  generate(data: ShellFunction[], ctx: GenerateContext): string {
    const items = data.filter((f) => f.enabled && f.body.powershell)
    if (items.length === 0) return ''

    const lines: string[] = ['# === 函数 ===']

    const grouped = new Map<string, ShellFunction[]>()
    for (const fn of items) {
      const cat = fn.category || 'custom'
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(fn)
    }

    for (const [category, fns] of grouped) {
      lines.push('')
      lines.push(`# --- ${category} ---`)
      for (const fn of fns) {
        if (fn.description) lines.push(`# ${fn.description}`)
        lines.push(`function ${fn.name} {`)
        lines.push(fn.body.powershell!)
        lines.push('}')
        lines.push('')
      }
    }

    return lines.join('\n')
  }
}
