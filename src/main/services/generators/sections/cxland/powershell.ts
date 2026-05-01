import type { SectionGenerator } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { CXLandSectionData } from './zsh'
import { buildPowerShellCXContent } from './powershell-builder'

export class CXLandPowerShellGenerator implements SectionGenerator<CXLandSectionData> {
  readonly sectionName = 'cxland'
  readonly shellType: ShellType = 'powershell'

  generate(data: CXLandSectionData): string {
    return buildPowerShellCXContent(data.cxConfig, data.decryptedTokens, data.systemProxy)
  }
}
