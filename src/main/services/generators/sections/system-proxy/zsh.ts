import type { SectionGenerator } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { SystemProxyConfig } from '@shared/system-proxy'
import { buildBashLikeSystemProxyFunctions } from './proxy-functions'

export class SystemProxyZshGenerator implements SectionGenerator<SystemProxyConfig> {
  readonly sectionName = 'systemProxy'
  readonly shellType: ShellType = 'zsh'

  generate(data: SystemProxyConfig): string {
    return buildBashLikeSystemProxyFunctions(data)
  }
}
