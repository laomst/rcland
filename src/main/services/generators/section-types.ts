import type { ShellType } from '@shared/shell'

/** Context passed to all section generators */
export interface GenerateContext {
  shellType: ShellType
  decrypt(value: string): string
  escapeValue(value: string): string
  timestamp: string
}

/** Interface for a module's section generator */
export interface SectionGenerator<TData = unknown> {
  readonly sectionName: string
  readonly shellType: ShellType
  generate(data: TData, ctx: GenerateContext): string
}
