import { execSync } from 'child_process'
import {
  SYSTEM_PROXY_TYPES,
  createEmptySystemProxyConfig,
} from '@shared/system-proxy'
import type { SystemProxyConfig, SystemProxyEnvVar } from '@shared/system-proxy'

interface ProxyUrls {
  http?: string
  https?: string
  socks?: string
}

function buildProxyEnvVars(urls: ProxyUrls): SystemProxyEnvVar[] {
  const vars: SystemProxyEnvVar[] = []

  for (const type of SYSTEM_PROXY_TYPES) {
    switch (type) {
      case 'http':
        vars.push({ type, value: urls.http ?? '' })
        break
      case 'https':
        vars.push({ type, value: urls.https ?? '' })
        break
      case 'all':
        vars.push({ type, value: urls.socks ?? '' })
        break
      case 'no':
        vars.push({ type, value: '' })
        break
    }
  }

  return vars
}

/**
 * Parse macOS `scutil --proxy` output and extract proxy URLs.
 */
function readMacOsProxy(): ProxyUrls {
  const output = execSync('scutil --proxy', {
    encoding: 'utf-8',
    timeout: 3000,
  })

  const get = (key: string): string | undefined => {
    const match = new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'm').exec(output)
    return match?.[1]?.trim()
  }

  const urls: ProxyUrls = {}

  const httpEnabled = get('HTTPEnable') === '1'
  if (httpEnabled) {
    const host = get('HTTPProxy')
    const port = get('HTTPPort')
    if (host) urls.http = `http://${host}${port ? `:${port}` : ''}`
  }

  const httpsEnabled = get('HTTPSEnable') === '1'
  if (httpsEnabled) {
    const host = get('HTTPSProxy')
    const port = get('HTTPSPort')
    if (host) urls.https = `http://${host}${port ? `:${port}` : ''}`
  }

  const socksEnabled = get('SOCKSEnable') === '1'
  if (socksEnabled) {
    const host = get('SOCKSProxy')
    const port = get('SOCKSPort')
    if (host) urls.socks = `socks5://${host}${port ? `:${port}` : ''}`
  }

  return urls
}

/**
 * Parse Windows registry proxy settings.
 * ProxyServer can be "host:port" or "http=host:port;https=host:port;..."
 */
function readWindowsProxy(): ProxyUrls {
  const ps = `
$reg = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
$enabled = (Get-ItemProperty -Path $reg -Name ProxyEnable -ErrorAction SilentlyContinue).ProxyEnable
$server = (Get-ItemProperty -Path $reg -Name ProxyServer -ErrorAction SilentlyContinue).ProxyServer
if ($enabled -and $server) { Write-Output "ENABLED"; Write-Output $server }
`.trim()

  const output = execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    timeout: 5000,
  }).trim()

  if (!output.startsWith('ENABLED')) return {}

  const serverLine = output.split(/\r?\n/)[1]?.trim()
  if (!serverLine) return {}

  const urls: ProxyUrls = {}

  // Semi-colon separated protocol-specific format: http=host:port;https=host:port
  if (serverLine.includes('=')) {
    for (const part of serverLine.split(';')) {
      const eq = part.indexOf('=')
      if (eq < 0) continue
      const proto = part.slice(0, eq).trim().toLowerCase()
      const addr = part.slice(eq + 1).trim()
      if (proto === 'http' && addr) urls.http = `http://${addr}`
      else if (proto === 'https' && addr) urls.https = `http://${addr}`
      else if (proto === 'socks' && addr) urls.socks = `socks5://${addr}`
    }
  } else {
    // Simple host:port format — applies to both http and https
    if (serverLine) {
      const url = `http://${serverLine}`
      urls.http = url
      urls.https = url
    }
  }

  return urls
}

/**
 * Parse GNOME proxy settings via gsettings.
 */
function readLinuxProxy(): ProxyUrls {
  const mode = execSync('gsettings get org.gnome.system.proxy mode', {
    encoding: 'utf-8',
    timeout: 3000,
  }).trim().replace(/'/g, '')

  if (mode !== 'manual') return {}

  const urls: ProxyUrls = {}

  const getSetting = (key: string): string => {
    try {
      return execSync(`gsettings get org.gnome.system.proxy.${key}`, {
        encoding: 'utf-8',
        timeout: 3000,
      }).trim().replace(/'/g, '')
    } catch {
      return ''
    }
  }

  const httpHost = getSetting('http host')
  const httpPort = getSetting('http port')
  if (httpHost) urls.http = `http://${httpHost}${httpPort ? `:${httpPort}` : ''}`

  const httpsHost = getSetting('https host')
  const httpsPort = getSetting('https port')
  if (httpsHost) urls.https = `http://${httpsHost}${httpsPort ? `:${httpsPort}` : ''}`

  const socksHost = getSetting('socks host')
  const socksPort = getSetting('socks port')
  if (socksHost) urls.socks = `socks5://${socksHost}${socksPort ? `:${socksPort}` : ''}`

  return urls
}

/**
 * Read OS-level proxy settings and return a normalized SystemProxyConfig.
 * Never throws — returns an empty config on any error.
 */
export function readOsProxy(): SystemProxyConfig {
  try {
    let urls: ProxyUrls

    switch (process.platform) {
      case 'darwin':
        urls = readMacOsProxy()
        break
      case 'win32':
        urls = readWindowsProxy()
        break
      case 'linux':
        urls = readLinuxProxy()
        break
      default:
        return createEmptySystemProxyConfig()
    }

    return { proxyEnvVars: buildProxyEnvVars(urls) }
  } catch {
    return createEmptySystemProxyConfig()
  }
}
