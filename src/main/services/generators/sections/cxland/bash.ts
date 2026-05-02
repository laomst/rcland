import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { CXLandSectionData } from './zsh'
import { buildBashLikeCXContent } from './bash-builder'

export class CXLandBashGenerator implements SectionGenerator<CXLandSectionData> {
  readonly sectionName = 'cxland'
  readonly shellType: ShellType = 'bash'

  generate(data: CXLandSectionData, ctx: GenerateContext): string {
    return buildBashLikeCXContent(data.cxConfig, data.decryptedTokens, ctx.proxyFunctionNames)
  }
}
