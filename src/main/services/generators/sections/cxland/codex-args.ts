/**
 * Sanitize a LaunchItem funcName into a Codex-safe provider ID.
 * Example: "cx-glm5" → "ccland_cx_glm5"
 */
export function sanitizeCodexProviderId(funcName: string): string {
  const cleaned = funcName.replace(/[^A-Za-z0-9_]/g, '_')
  return `ccland_${cleaned}`
}

/**
 * Escape a string for inclusion in a TOML basic string literal.
 * TOML basic strings use double quotes, so backslash and double quote must be escaped.
 */
export function escapeTomlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Build a `-c key="value"` argument wrapped in bash/zsh single quotes.
 * The outer single quotes prevent the shell from interpreting the inner double quotes.
 */
export function buildBashCodexConfigArg(key: string, value: string): string {
  const escaped = escapeTomlString(value)
  return `'${key}="${escaped}"'`
}

/**
 * Build a `-c key="value"` argument wrapped in PowerShell single quotes.
 * In PS single-quoted strings, embedded single quotes are escaped by doubling.
 */
export function buildPowerShellCodexConfigArg(key: string, value: string): string {
  const tomlEscaped = escapeTomlString(value)
  const psEscaped = tomlEscaped.replace(/'/g, "''")
  return `'${key}="${psEscaped}"'`
}
