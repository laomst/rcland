import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PromptConfig } from '../../../../../shared/shell-types'
import type { ShellType } from '../../../../../shared/shell'

export class PromptPowerShellGenerator implements SectionGenerator<PromptConfig> {
  readonly sectionName = 'prompt'
  readonly shellType: ShellType = 'powershell'

  generate(data: PromptConfig, ctx: GenerateContext): string {
    if (data.type === 'custom' && data.customTemplate?.powershell) {
      const lines: string[] = ['# === 提示符 ===']
      lines.push(data.customTemplate.powershell)
      return lines.join('\n')
    }

    // Default PowerShell prompt (simple or git)
    const lines: string[] = ['# === 提示符 ===']
    lines.push('function prompt {')

    if (data.type === 'git') {
      lines.push('    $branch = git branch --show-current 2>$null')
      lines.push('    $gitInfo = if ($branch) { " ($branch)" } else { "" }')
      lines.push('    "$($env:USERNAME)@$($env:COMPUTERNAME):$(Get-Location)$gitInfo$ "')
    } else {
      lines.push('    "$($env:USERNAME)@$($env:COMPUTERNAME):$(Get-Location)$ "')
    }

    lines.push('}')

    return lines.join('\n')
  }
}
