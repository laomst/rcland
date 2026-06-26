import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { OCLandSectionData } from './zsh'
import { buildBashLikeOCContent } from './bash-builder'

export class OCLandBashGenerator implements SectionGenerator<OCLandSectionData> {
  readonly sectionName = 'ocland'
  readonly shellType: ShellType = 'bash'

  generate(data: OCLandSectionData, ctx: GenerateContext): string {
    return buildBashLikeOCContent(data.ocConfig, data.decryptedTokens, ctx.proxyFunctionNames, ctx.machineId)
  }
}
