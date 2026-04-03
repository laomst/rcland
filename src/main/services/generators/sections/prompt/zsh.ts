import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PromptConfig } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

const DEFAULT_SIMPLE = '%F{green}%n@%m%f:%F{blue}%~%f$ '
const DEFAULT_GIT = '%F{green}%n@%m%f:%F{blue}%~%f%F{yellow}$(git branch --show-current 2>/dev/null | sed "s/^/ (/;s/$/)/")%f$ '

export class PromptZshGenerator implements SectionGenerator<PromptConfig> {
  readonly sectionName = 'prompt'
  readonly shellType: ShellType = 'zsh'

  generate(data: PromptConfig, ctx: GenerateContext): string {
    const lines: string[] = ['# === 提示符 ===']
    lines.push('setopt PROMPT_SUBST')

    switch (data.type) {
      case 'simple':
        lines.push(`PROMPT='${data.simpleFormat || DEFAULT_SIMPLE}'`)
        break
      case 'git':
        lines.push(`PROMPT='${data.gitFormat || DEFAULT_GIT}'`)
        break
      case 'custom':
        if (data.customTemplate?.zsh) {
          lines.push(data.customTemplate.zsh)
        }
        break
    }

    return lines.join('\n')
  }
}
