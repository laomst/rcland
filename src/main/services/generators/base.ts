import type { CCLaunchData } from '../../../shared/types'
import type { ShellType } from '../../../shared/shell'

export interface DecryptedValues {
  get: (key: string) => string
}

export interface ShellGenerator {
  readonly shellType: ShellType
  readonly sourceMarkers: { begin: string; end: string }
  generate(data: CCLaunchData, values: DecryptedValues): string
  generateSourceLine(outputPath: string): string
}

export abstract class BaseShellGenerator implements ShellGenerator {
  abstract readonly shellType: ShellType
  abstract readonly sourceMarkers: { begin: string; end: string }
  abstract generate(data: CCLaunchData, values: DecryptedValues): string
  abstract generateSourceLine(outputPath: string): string

  protected header(): string {
    return [
      '# 由 CCland 自动生成，请勿手动编辑',
      `# 生成时间: ${new Date().toLocaleString('zh-CN')}`,
      ''
    ].join('\n')
  }

  protected separator(title: string): string {
    const line = '='.repeat(60)
    return `\n# ${line}\n# ${title}\n# ${line}\n`
  }
}
