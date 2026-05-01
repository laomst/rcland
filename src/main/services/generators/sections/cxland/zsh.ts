import type { SectionGenerator } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { CXLandData } from '@shared/types'
import type { SystemProxyConfig } from '@shared/system-proxy'
import { buildBashLikeCXContent } from './bash-builder'

export interface CXLandSectionData {
  cxConfig: CXLandData
  decryptedTokens: Map<string, string>
  systemProxy: SystemProxyConfig
}

export class CXLandZshGenerator implements SectionGenerator<CXLandSectionData> {
  readonly sectionName = 'cxland'
  readonly shellType: ShellType = 'zsh'

  generate(data: CXLandSectionData): string {
    return buildBashLikeCXContent(data.cxConfig, data.decryptedTokens, data.systemProxy)
  }
}
