import type { SectionGenerator } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { OCLandSectionData } from './zsh'
import { buildPowerShellOCContent } from './powershell-builder'

export class OCLandPowerShellGenerator implements SectionGenerator<OCLandSectionData> {
  readonly sectionName = 'ocland'
  readonly shellType: ShellType = 'powershell'

  generate(data: OCLandSectionData): string {
    return buildPowerShellOCContent(data.ocConfig, data.decryptedTokens)
  }
}
