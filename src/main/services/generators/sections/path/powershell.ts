import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { PathEntry } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { quotePowerShellLiteral } from '../../shell-syntax'

export class PathPowerShellGenerator implements SectionGenerator<PathEntry[]> {
  readonly sectionName = 'path'
  readonly shellType: ShellType = 'powershell'

  generate(data: PathEntry[], ctx: GenerateContext): string {
    const items = data.filter(
      (e) => e.enabled && (!e.shells || e.shells.length === 0 || e.shells.includes('powershell'))
    )
    if (items.length === 0) return ''

    const lines: string[] = []
    lines.push('$customPaths = @(')

    for (const e of items) {
      // 检测路径中是否包含变量引用
      const varMatch = e.path.match(/\$([A-Za-z_][A-Za-z0-9_]*)/g)
      if (varMatch) {
        // PowerShell 变量直接展开，需要检查是否为空
        const firstVar = varMatch[0].substring(1) // 去掉 $ 符号
        lines.push(`    @{Path=${quotePowerShellLiteral(e.path)}; Condition='$${firstVar}'}`)
      } else {
        lines.push(`    @{Path=${quotePowerShellLiteral(e.path)}; Condition=''}`)
      }
    }

    lines.push(')')
    lines.push('')
    lines.push('$newPaths = @()')
    lines.push('foreach ($entry in $customPaths) {')
    lines.push('    $pathToCheck = $entry.Path')
    lines.push('    if ($entry.Condition -and -not (Get-Variable -Name $entry.Condition.Substring(1) -ErrorAction SilentlyContinue)) { continue }')
    lines.push('    $expandedPath = $ExecutionContext.InvokeCommand.ExpandString($pathToCheck)')
    lines.push('    if (Test-Path -Path $expandedPath -PathType Container) {')
    lines.push('        $newPaths += $expandedPath')
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
