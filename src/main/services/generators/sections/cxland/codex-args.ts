import type { McpServer } from '@shared/types'

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

/**
 * Build an array of `-c` argument strings for MCP server injection (bash/zsh).
 * Each element is a single-quoted shell word ready to be passed as -c <arg>.
 */
export function buildBashCXMcpArgs(servers: McpServer[]): string[] {
  const args: string[] = []
  for (const s of servers) {
    const prefix = `mcp_servers.${s.key}`
    if (s.type === 'stdio') {
      args.push(buildBashCodexConfigArg(`${prefix}.command`, s.command ?? ''))
      if (s.args && s.args.length > 0) {
        args.push(`'${prefix}.args=${JSON.stringify(s.args)}'`)
      }
      args.push(buildBashCodexConfigArg(`${prefix}.transport`, 'stdio'))
      if (s.env) {
        for (const [k, v] of Object.entries(s.env)) {
          args.push(buildBashCodexConfigArg(`${prefix}.env.${k}`, v))
        }
      }
    } else {
      args.push(buildBashCodexConfigArg(`${prefix}.url`, s.url ?? ''))
      if (s.bearerTokenEnvVar) {
        args.push(buildBashCodexConfigArg(`${prefix}.bearer_token_env_var`, s.bearerTokenEnvVar))
      }
    }
    if (s.startupTimeout != null) {
      args.push(`'${prefix}.startup_timeout_sec=${s.startupTimeout}'`)
    }
    if (s.toolTimeout != null) {
      args.push(`'${prefix}.tool_timeout_sec=${s.toolTimeout}'`)
    }
  }
  return args
}

/**
 * Build an array of `-c` argument strings for MCP server injection (PowerShell).
 * Each element is a single-quoted PS word ready to be passed as -c <arg>.
 */
export function buildPowerShellCXMcpArgs(servers: McpServer[]): string[] {
  const args: string[] = []
  for (const s of servers) {
    const prefix = `mcp_servers.${s.key}`
    if (s.type === 'stdio') {
      args.push(buildPowerShellCodexConfigArg(`${prefix}.command`, s.command ?? ''))
      if (s.args && s.args.length > 0) {
        args.push(`'${prefix}.args=${JSON.stringify(s.args).replace(/'/g, "''")}'`)
      }
      args.push(buildPowerShellCodexConfigArg(`${prefix}.transport`, 'stdio'))
      if (s.env) {
        for (const [k, v] of Object.entries(s.env)) {
          args.push(buildPowerShellCodexConfigArg(`${prefix}.env.${k}`, v))
        }
      }
    } else {
      args.push(buildPowerShellCodexConfigArg(`${prefix}.url`, s.url ?? ''))
      if (s.bearerTokenEnvVar) {
        args.push(buildPowerShellCodexConfigArg(`${prefix}.bearer_token_env_var`, s.bearerTokenEnvVar))
      }
    }
    if (s.startupTimeout != null) {
      args.push(`'${prefix}.startup_timeout_sec=${s.startupTimeout}'`)
    }
    if (s.toolTimeout != null) {
      args.push(`'${prefix}.tool_timeout_sec=${s.toolTimeout}'`)
    }
  }
  return args
}
