import type { SectionGenerator, GenerateContext } from '../../section-types'
import type { ShellType } from '@shared/shell'
import { buildBashLikeSystemProxyFunctions } from './proxy-functions'

export class SystemProxyBashGenerator implements SectionGenerator<void> {
  readonly sectionName = 'systemProxy'
  readonly shellType: ShellType = 'bash'

  generate(_data: void, ctx: GenerateContext): string {
    return buildBashLikeSystemProxyFunctions(ctx.proxyFunctionNames)
  }
}
