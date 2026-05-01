import type { CXLandData, CXProvider, CXConfigSet, CXEndpoint } from '@shared/types'
import { getCXEndpointUrl } from '@shared/types'
import {
  getSystemProxyEnvNames,
  SYSTEM_PROXY_ENV_NAMES,
  type SystemProxyConfig
} from '@shared/system-proxy'
import { quoteBashLikeLiteral, assertSafeShellName } from '../../shell-syntax'
import { sanitizeCodexProviderId, buildBashCodexConfigArg } from './codex-args'

/**
 * Build bash/zsh shell content for all enabled CXConfigSets and optional selector.
 *
 * Key differences from CC (Claude Code):
 * - Uses `codex` command, NOT `claude`
 * - Uses `-c key="value"` dynamic config, NOT environment variable templates
 * - NO `-n` session name (Codex has no session concept)
 * - `OPENAI_API_KEY` env var, not `ANTHROPIC_API_KEY`
 * - `cxd` alias uses `--dangerously-bypass-approvals-and-sandbox`
 */
export function buildBashLikeCXContent(
  data: CXLandData,
  decryptedTokens: Map<string, string>,
  systemProxy: SystemProxyConfig
): string {
  const lines: string[] = []

  const providerMap = new Map(data.providers.map((p) => [p.id, p]))
  const enabledConfigs = data.configs.filter((c) => c.enabled)

  for (const config of enabledConfigs) {
    const provider = providerMap.get(config.providerId)
    if (!provider) {
      writeErrorStub(lines, config, `错误: 配置项 ${config.funcName} 的 Provider 不存在`)
      continue
    }
    if (!provider.enabled) {
      continue
    }
    writeFunction(lines, provider, config, decryptedTokens, systemProxy)
  }

  if (data.selector.enabled && enabledConfigs.length > 0) {
    const selectorFuncName = assertSafeShellName(data.selector.funcName, 'selector')
    writeSelectorFunction(lines, selectorFuncName, data.selector.promptTitle, enabledConfigs)
    lines.push('')
    lines.push(`alias cxd='${selectorFuncName} --dangerously-bypass-approvals-and-sandbox'`)
  }

  return lines.join('\n')
}

function writeErrorStub(lines: string[], config: CXConfigSet, message: string): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  lines.push('')
  lines.push(`${funcName}() { echo ${quoteBashLikeLiteral(message)} >&2; return 1; }`)
}

function writeFunction(
  lines: string[],
  provider: CXProvider,
  config: CXConfigSet,
  tokens: Map<string, string>,
  systemProxy: SystemProxyConfig
): void {
  const funcName = assertSafeShellName(config.funcName, config.name || config.id)
  const tokenKey = `cx-token:${config.id}`
  const tokenVal = tokens.get(tokenKey) ?? ''

  if (!tokenVal) {
    writeErrorStub(lines, config, `错误: 配置项 ${funcName} 未设置 Token.请在 RCLand 中配置`)
    return
  }

  const endpoint = getEndpoint(provider, config.endpointId)
  const baseUrl = getCXEndpointUrl(provider, config.endpointId)
  if (!baseUrl) {
    writeErrorStub(lines, config, `错误: 配置项 ${funcName} 的 Endpoint URL 为空`)
    return
  }

  const providerId = sanitizeCodexProviderId(funcName)
  const envArgs = buildBashLikeProxyArgs(endpoint, systemProxy)

  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  local _ra=("$@")')
  lines.push(`  env ${envArgs.join(' ')} \\`)
  lines.push(`  OPENAI_API_KEY=${quoteBashLikeLiteral(tokenVal)} \\`)
  lines.push(`  codex \\`)

  // -c args: provider config
  lines.push(`    -c ${buildBashCodexConfigArg(`model_providers.${providerId}.name`, provider.name)} \\`)
  lines.push(`    -c ${buildBashCodexConfigArg(`model_providers.${providerId}.base_url`, baseUrl)} \\`)
  lines.push(`    -c ${buildBashCodexConfigArg(`model_providers.${providerId}.env_key`, 'OPENAI_API_KEY')} \\`)
  lines.push(`    -c ${buildBashCodexConfigArg(`model_providers.${providerId}.wire_api`, provider.wireApi)} \\`)

  // -c args: active provider selection
  lines.push(`    -c ${buildBashCodexConfigArg('model_provider', providerId)} \\`)

  // -c args: model (optional)
  if (config.model) {
    lines.push(`    -c ${buildBashCodexConfigArg('model', config.model)} \\`)
  }

  lines.push('    "${_ra[@]}"')
  lines.push('}')
}

function writeSelectorFunction(
  lines: string[],
  funcName: string,
  promptTitle: string,
  entries: CXConfigSet[]
): void {
  lines.push('')
  lines.push(`${funcName}() {`)
  lines.push('  local _ra=("$@")')
  lines.push('')
  lines.push('  local _opts=(')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`    ${quoteBashLikeLiteral(`${name}:${entry.name || entry.funcName}`)}`)
  }
  lines.push('  )')
  lines.push(`  prompt-select ${quoteBashLikeLiteral(promptTitle)} "\${_opts[@]}" || return 0`)
  lines.push('')
  lines.push('  case $REPLY in')
  for (const entry of entries) {
    const name = assertSafeShellName(entry.funcName, entry.name || entry.id)
    lines.push(`    ${name})  ${name} "\${_ra[@]}" ;;`)
  }
  lines.push('  esac')
  lines.push('}')
}

function getEndpoint(provider: CXProvider, endpointId?: string): CXEndpoint | null {
  if (!provider.endpoints || provider.endpoints.length === 0) return null
  return provider.endpoints.find((ep) => ep.id === endpointId) ?? provider.endpoints[0]
}

function buildBashLikeProxyArgs(endpoint: CXEndpoint | null, systemProxy: SystemProxyConfig): string[] {
  if (!endpoint?.useSystemProxy) {
    return SYSTEM_PROXY_ENV_NAMES.flatMap((key) => ['-u', key])
  }

  return systemProxy.proxyEnvVars
    .filter((item) => item.value.trim())
    .flatMap(({ type, value }) =>
      getSystemProxyEnvNames(type).map((key) => `${key}=${quoteBashLikeLiteral(value)}`)
    )
}
