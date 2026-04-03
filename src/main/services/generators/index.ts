import type { ShellType } from '../../../shared/shell'
import type { ShellGenerator } from './base'
import { ZshGenerator } from './zsh'
import { BashGenerator } from './bash'
import { PowerShellGenerator } from './powershell'

const registry = new Map<ShellType, ShellGenerator>()

function register(generator: ShellGenerator): void {
  registry.set(generator.shellType, generator)
}

register(new ZshGenerator())
register(new BashGenerator())
register(new PowerShellGenerator())

export function getGenerator(shellType: ShellType): ShellGenerator {
  const gen = registry.get(shellType)
  if (!gen) throw new Error(`Unsupported shell type: ${shellType}`)
  return gen
}

export function getSupportedShells(): ShellType[] {
  return Array.from(registry.keys())
}
