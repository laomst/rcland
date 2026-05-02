import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { CXLandData } from '@shared/types'
import { buildBashLikeCXContent } from './bash-builder'

export interface CXLandSectionData {
  cxConfig: CXLandData
  decryptedTokens: Map<string, string>
}

export class CXLandZshGenerator implements SectionGenerator<CXLandSectionData> {
  readonly sectionName = 'cxland'
  readonly shellType: ShellType = 'zsh'

  generate(data: CXLandSectionData, ctx: GenerateContext): string {
    return buildBashLikeCXContent(data.cxConfig, data.decryptedTokens, ctx.proxyFunctionNames)
  }
}
