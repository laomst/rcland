import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { CXLandSectionData } from './zsh'
import { buildPowerShellCXContent } from './powershell-builder'

export class CXLandPowerShellGenerator implements SectionGenerator<CXLandSectionData> {
  readonly sectionName = 'cxland'
  readonly shellType: ShellType = 'powershell'

  generate(data: CXLandSectionData, ctx: GenerateContext): string {
    return buildPowerShellCXContent(data.cxConfig, data.decryptedTokens, data.mcpServersData, ctx.machineId)
  }
}
