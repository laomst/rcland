import type { SectionGenerator } from '../../section-types'
import type { ShellType } from '@shared/shell'
import type { SystemProxyConfig } from '@shared/system-proxy'
import { buildPowerShellSystemProxyFunctions } from './proxy-functions'

export class SystemProxyPowerShellGenerator implements SectionGenerator<SystemProxyConfig> {
  readonly sectionName = 'systemProxy'
  readonly shellType: ShellType = 'powershell'

  generate(data: SystemProxyConfig): string {
    return buildPowerShellSystemProxyFunctions(data)
  }
}
