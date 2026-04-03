import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PromptConfig } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

const DEFAULT_SIMPLE = '\\[\\033[32m\\]\\u@\\h\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ '
const DEFAULT_GIT = '\\[\\033[32m\\]\\u@\\h\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]\\[\\033[33m\\]$(git branch --show-current 2>/dev/null | sed "s/^/ (/;s/$/)/")\\[\\033[0m\\]$ '

export class PromptBashGenerator implements SectionGenerator<PromptConfig> {
  readonly sectionName = 'prompt'
  readonly shellType: ShellType = 'bash'

  generate(data: PromptConfig, ctx: GenerateContext): string {
    const lines: string[] = ['# === 提示符 ===']

    switch (data.type) {
      case 'simple':
        lines.push(`PS1='${data.simpleFormat || DEFAULT_SIMPLE}'`)
        break
      case 'git':
        lines.push(`PS1='${data.gitFormat || DEFAULT_GIT}'`)
        break
      case 'custom':
        if (data.customTemplate?.bash) {
          lines.push(data.customTemplate.bash)
        }
        break
    }

    return lines.join('\n')
  }
}
