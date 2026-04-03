import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellFunction } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class FunctionsBashGenerator implements SectionGenerator<ShellFunction[]> {
  readonly sectionName = 'functions'
  readonly shellType: ShellType = 'bash'

  generate(data: ShellFunction[], ctx: GenerateContext): string {
    const items = data.filter((f) => f.enabled && (f.body.bash || f.body.zsh))
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
        // Prefer bash body, fall back to zsh (often compatible)
        const body = fn.body.bash ?? fn.body.zsh ?? ''
        lines.push(`${fn.name}() {`)
        lines.push(body)
        lines.push('}')
        lines.push('')
      }
    }

    return lines.join('\n')
  }
}
