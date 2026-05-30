import {
  DEFAULT_PROXY_FUNCTION_NAMES, type OCLandData, type OCProvider, type OCLaunchItem,
  type OCEndpoint, type ProxyFunctionNames, getOCEndpointUrl
} from '@shared/types'
import { quoteBashLikeLiteral, assertSafeShellName } from '../../shell-syntax'
import { ocKeyEnvVarName } from '../../oc-config'

/**
 * Build bash/zsh shell content for all enabled OCLaunchItems and optional selector.
 *
 * OCLand (opencode) launch form: a generated JSON config + a shell function that
 * exports the decrypted token into RCLAND_OC_<id>_KEY, points OPENCODE_CONFIG at
 * the JSON, and runs `opencode -m provider/model`.
 */
export function buildBashLikeOCContent(
  data: OCLandData,
  decryptedTokens: Map<string, string>,
  proxyFns: ProxyFunctionNames = DEFAULT_PROXY_FUNCTION_NAMES
): string {
  const lines: string[] = []
  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabled = data.launchItems.filter((c) => c.enabled)

  for (const item of enabled) {
    if (item.passthrough) {
      writePassthrough(lines, item, proxyFns)
      continue
    }
    const provider = providerMap.get(item.providerId)
    if (!provider) {
      writeErrorStub(lines, item, `错误: 启动项 ${item.funcName} 的 Provider 不存在`)
      continue
    }
    if (!provider.enabled) continue
    writeFunction(lines, provider, item, decryptedTokens, proxyFns)
  }

  if (enabled.length > 0) {
    const selFn = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelector(lines, selFn, data.selector.promptTitle, enabled)
  }

  const ls = data.selector.localSelector
  if (ls?.enabled) {
    const localFn = assertSafeShellName(ls.funcName || 'ocl', 'local-selector')
    const localEntries = enabled.filter((c) => c.localOnly)
    if (localEntries.length > 0) {
      writeSelector(lines, localFn, ls.promptTitle || data.selector.promptTitle, localEntries)
    } else {
      lines.push('')
      lines.push(`${localFn}() { echo ${quoteBashLikeLiteral('错误: 没有任何本机启动器,请在 RCLand 中将启动项标记为「仅本机」')} >&2; return 1; }`)
    }
  }

  if (data.selector.kanban?.enabled) {
    const kFn = assertSafeShellName(data.selector.kanban.funcName || 'show-oc-usage', 'kanban')
    lines.push('')
    lines.push(`${kFn}() {`)
    lines.push('  if [ -z "$CCLAND_OC_TOKEN_KANBAN" ]; then')
    lines.push('    echo "\\033[31m错误：未配置看板 URL，请在供应商管理中设置\\033[0m" >&2')
    lines.push('    return 1')
    lines.push('  fi')
    lines.push('  (open "$CCLAND_OC_TOKEN_KANBAN" 2>/dev/null || xdg-open "$CCLAND_OC_TOKEN_KANBAN" 2>/dev/null) &')
    lines.push('}')
  }

  return lines.join('\n')
}

function writeErrorStub(lines: string[], item: OCLaunchItem, message: string): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  lines.push('')
  lines.push(`${fn}() { echo ${quoteBashLikeLiteral(message)} >&2; return 1; }`)
}

function writeFunction(
  lines: string[], provider: OCProvider, item: OCLaunchItem,
  tokens: Map<string, string>, proxyFns: ProxyFunctionNames
): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  const tokenVal = tokens.get(`oc-token:${item.id}`) ?? ''
  if (!tokenVal) {
    writeErrorStub(lines, item, `错误: 启动项 ${fn} 未设置 Token.请在 RCLand 中配置`)
    return
  }
  const baseUrl = getOCEndpointUrl(provider, item.endpointId)
  if (!baseUrl) {
    writeErrorStub(lines, item, `错误: 启动项 ${fn} 的 Endpoint URL 为空`)
    return
  }

  const endpoint = getEndpoint(provider, item.endpointId)
  const envVar = ocKeyEnvVarName(item.id)

  lines.push('')
  lines.push(`${fn}() {`)
  lines.push('  (')
  if (endpoint?.useSystemProxy) lines.push(`    ${proxyFns.proxyOn} || return 1`)
  else lines.push(`    ${proxyFns.proxyOff}`)
  lines.push(`    export ${envVar}=${quoteBashLikeLiteral(tokenVal)}`)
  if (provider.kanbanUrl) lines.push(`    export CCLAND_OC_TOKEN_KANBAN=${quoteBashLikeLiteral(provider.kanbanUrl)}`)
  lines.push(`    export OPENCODE_CONFIG="$HOME/.rcland/opencode/${item.id}.json"`)
  const cmd = item.modelId
    ? `opencode -m ${quoteBashLikeLiteral(`${provider.id}/${item.modelId}`)} "\${@}"`
    : `opencode "\${@}"`
  lines.push(`    ${cmd}`)
  lines.push('  )')
  lines.push('}')
}

function writeSelector(lines: string[], fn: string, promptTitle: string, entries: OCLaunchItem[]): void {
  lines.push('')
  lines.push(`${fn}() {`)
  lines.push('  local _opts=(')
  for (const e of entries) {
    const name = assertSafeShellName(e.funcName, e.name || e.id)
    lines.push(`    ${quoteBashLikeLiteral(`${name}:${e.name || e.funcName}`)}`)
  }
  lines.push('  )')
  lines.push(`  prompt-select ${quoteBashLikeLiteral(promptTitle)} "\${_opts[@]}" || return 0`)
  lines.push('')
  lines.push('  case $REPLY in')
  for (const e of entries) {
    const name = assertSafeShellName(e.funcName, e.name || e.id)
    lines.push(`    ${name})  ${name} "\${@}" ;;`)
  }
  lines.push('  esac')
  lines.push('}')
}

function writePassthrough(lines: string[], item: OCLaunchItem, proxyFns: ProxyFunctionNames): void {
  const fn = assertSafeShellName(item.funcName, item.name || item.id)
  lines.push('')
  lines.push(`${fn}() {`)
  lines.push('  (')
  if (item.useSystemProxy) lines.push(`    ${proxyFns.proxyOn} || return 1`)
  else lines.push(`    ${proxyFns.proxyOff}`)
  const cmd = item.passthroughCommand?.trim() || 'opencode'
  lines.push(`    ${assertSafeShellName(cmd, fn)} "$@"`)
  lines.push('  )')
  lines.push('}')
}

function getEndpoint(provider: OCProvider, endpointId?: string): OCEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}
