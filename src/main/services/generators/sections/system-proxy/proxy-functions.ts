import {
  getSystemProxyEnvNames,
  SYSTEM_PROXY_ENV_NAMES,
  type SystemProxyConfig,
  type SystemProxyEnvVar,
} from '@shared/system-proxy'
import { quoteBashLikeLiteral, quotePowerShellLiteral } from '../../shell-syntax'

function getConfiguredItems(data: SystemProxyConfig): SystemProxyEnvVar[] {
  return data.proxyEnvVars.filter((item) => item.value.trim())
}

export function buildBashLikeSystemProxyFunctions(data: SystemProxyConfig): string {
  const items = getConfiguredItems(data)
  const lines: string[] = ['', 'proxy-on() {']

  if (items.length === 0) {
    lines.push('  echo "未配置系统代理" >&2')
  } else {
    for (const { type, value } of items) {
      for (const key of getSystemProxyEnvNames(type)) {
        lines.push(`  export ${key}=${quoteBashLikeLiteral(value)}`)
      }
    }
  }

  lines.push(
    '}',
    '',
    'proxy-off() {',
    `  unset ${SYSTEM_PROXY_ENV_NAMES.join(' ')}`,
    '}',
    '',
    'proxy-status() {'
  )

  for (const key of SYSTEM_PROXY_ENV_NAMES) {
    lines.push(`  printf '%-12s %s\\n' '${key}' "\${${key}:-(empty)}"`)
  }

  lines.push('}')
  return lines.join('\n')
}

export function buildPowerShellSystemProxyFunctions(data: SystemProxyConfig): string {
  const items = getConfiguredItems(data)
  const lines = ['', 'function proxy-on {']

  if (items.length === 0) {
    lines.push('    Write-Error "未配置系统代理"')
  } else {
    for (const { type, value } of items) {
      for (const key of getSystemProxyEnvNames(type)) {
        lines.push(`    $env:${key} = ${quotePowerShellLiteral(value)}`)
      }
    }
  }

  lines.push(
    '}',
    '',
    'function proxy-off {'
  )

  for (const key of SYSTEM_PROXY_ENV_NAMES) {
    lines.push(`    Remove-Item "Env:${key}" -ErrorAction SilentlyContinue`)
  }

  lines.push(
    '}',
    '',
    'function proxy-status {'
  )

  for (const key of SYSTEM_PROXY_ENV_NAMES) {
    lines.push(`    $value = $env:${key}`)
    lines.push('    if ([string]::IsNullOrEmpty($value)) { $value = "(empty)" }')
    lines.push(`    Write-Host ("${key.padEnd(12, ' ')}: " + $value)`)
  }

  lines.push('}')
  return lines.join('\n')
}
