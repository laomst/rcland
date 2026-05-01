const SHELL_NAME_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/
const ALIAS_NAME_RE = /^[A-Za-z0-9_.~-]+$/
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function assertSafeShellName(name: string, label: string): string {
  const trimmed = name.trim()
  if (!SHELL_NAME_RE.test(trimmed)) {
    throw new Error(`Invalid shell function name for ${label}: ${name}`)
  }
  return trimmed
}

export function assertSafeAliasName(name: string, label: string): string {
  const trimmed = name.trim()
  if (!ALIAS_NAME_RE.test(trimmed)) {
    throw new Error(`Invalid shell alias name for ${label}: ${name}`)
  }
  return trimmed
}

export function assertSafeEnvName(name: string, label: string): string {
  const trimmed = name.trim()
  if (!ENV_NAME_RE.test(trimmed)) {
    throw new Error(`Invalid environment variable name for ${label}: ${name}`)
  }
  return trimmed
}

export function quoteBashLikeLiteral(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

export function quotePowerShellLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}
