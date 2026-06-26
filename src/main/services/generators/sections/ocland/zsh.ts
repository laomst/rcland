import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { OCLandData, McpServersData } from '@shared/types'
import { buildBashLikeOCContent } from './bash-builder'

export interface OCLandSectionData {
  ocConfig: OCLandData
  decryptedTokens: Map<string, string>
  mcpServersData: McpServersData
}

export class OCLandZshGenerator implements SectionGenerator<OCLandSectionData> {
  readonly sectionName = 'ocland'
  readonly shellType: ShellType = 'zsh'

  generate(data: OCLandSectionData, ctx: GenerateContext): string {
    return buildBashLikeOCContent(data.ocConfig, data.decryptedTokens, ctx.proxyFunctionNames, ctx.machineId)
  }
}
