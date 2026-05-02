import type { ShellType } from '@shared/shell'
import type { PathVariable } from '@shared/shell-types'

/** Context passed to all section generators */
export interface GenerateContext {
  shellType: ShellType
  decrypt(value: string): string
  escapeValue(value: string): string
  timestamp: string
  proxyFunctionNames: { proxyOn: string; proxyOff: string; proxyStatus: string }
  pathVariables: PathVariable[]
}

/** Interface for a module's section generator */
export interface SectionGenerator<TData = unknown> {
  readonly sectionName: string
  readonly shellType: ShellType
  generate(data: TData, ctx: GenerateContext): string
}
