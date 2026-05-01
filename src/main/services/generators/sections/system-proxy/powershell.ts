import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import { buildPowerShellSystemProxyFunctions } from './proxy-functions'

export class SystemProxyPowerShellGenerator implements SectionGenerator<void> {
  readonly sectionName = 'systemProxy'
  readonly shellType: ShellType = 'powershell'

  generate(_data: void, ctx: GenerateContext): string {
    return buildPowerShellSystemProxyFunctions(ctx.proxyFunctionNames)
  }
}
