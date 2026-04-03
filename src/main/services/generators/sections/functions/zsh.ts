import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellFunction } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class FunctionsZshGenerator implements SectionGenerator<ShellFunction[]> {
  readonly sectionName = 'functions'
  readonly shellType: ShellType = 'zsh'

  generate(data: ShellFunction[], ctx: GenerateContext): string {
    const items = data.filter((f) => f.enabled && (f.body.zsh || f.body.bash))
    if (items.length === 0) return ''

    const lines: string[] = ['# === 函数 ===']

    // Group by category
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
        // Prefer zsh body, fall back to bash (often compatible)
        const body = fn.body.zsh ?? fn.body.bash ?? ''
        lines.push(`${fn.name}() {`)
        lines.push(body)
        lines.push('}')
        lines.push('')
      }
    }

    return lines.join('\n')
  }
}
