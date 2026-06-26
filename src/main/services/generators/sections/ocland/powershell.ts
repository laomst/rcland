import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { OCLandSectionData } from './zsh'
import { buildPowerShellOCContent } from './powershell-builder'

export class OCLandPowerShellGenerator implements SectionGenerator<OCLandSectionData> {
  readonly sectionName = 'ocland'
  readonly shellType: ShellType = 'powershell'

  generate(data: OCLandSectionData, ctx: GenerateContext): string {
    return buildPowerShellOCContent(data.ocConfig, data.decryptedTokens, ctx.machineId)
  }
}
