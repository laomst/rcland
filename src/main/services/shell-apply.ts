import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { dirname } from 'path'
import type { ShellType } from '@shared/shell'
import { getShellOutputPath } from '@shared/shell'
import type { CCLaunchData, CXLandData, OCLandData, McpServersData } from '@shared/types'
import { createEmptyMcpServersData } from '@shared/types'
import type { ShellConfigData } from '@shared/shell-types'
import { resolveMcpServers } from '@shared/mcp-resolve'
import { buildDecryptedMap, buildCXDecryptedMap, buildOCDecryptedMap, decryptShellVariables } from './crypto-utils'
import { createGenerateContext } from './generators/context'
import { generateFullConfig } from './generators/orchestrator'
import { buildOCConfigFiles, writeOCConfigFiles } from './generators/oc-config'
import { buildCCMcpConfigFiles, writeCCMcpConfigFiles } from './generators/cc-mcp-config'
import { resolveHomePath } from './path-utils'

export interface GenerateConfigInput {
  shellType: ShellType
  ccData: CCLaunchData
  cxData: CXLandData
  ocData: OCLandData
  shellConfig: ShellConfigData
  keyPassphrase: string
  decryptedTokens?: Map<string, string>
  proxyFunctionNames?: { proxyOn: string; proxyOff: string; proxyStatus: string }
  mcpServersData?: McpServersData
}

export interface ApplyConfigInput {
  shellTypes: ShellType[]
  ccData: CCLaunchData
  cxData: CXLandData
  ocData: OCLandData
  shellConfig: ShellConfigData
  keyPassphrase: string
  proxyFunctionNames?: { proxyOn: string; proxyOff: string; proxyStatus: string }
  enabledShells: Partial<Record<ShellType, { enabled: boolean }>>
  injectSourceBlock: (shellType: ShellType, outputPath: string) => void
  createBackup?: (shellType: ShellType, outputPath: string) => void
  pruneBackups?: (shellType: ShellType, keepCount: number) => void
  mcpServersData?: McpServersData
}

function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function getDecryptedTokensOrThrow(ccData: CCLaunchData, cxData: CXLandData, ocData: OCLandData, keyPassphrase: string): Map<string, string> {
  const ccResult = buildDecryptedMap(ccData, keyPassphrase)
  const cxResult = buildCXDecryptedMap(cxData, keyPassphrase)
  const ocResult = buildOCDecryptedMap(ocData, keyPassphrase)
  if (ccResult.decryptFailed || cxResult.decryptFailed || ocResult.decryptFailed) throw new Error('DECRYPT_FAILED')
  return new Map<string, string>([...ccResult.map, ...cxResult.map, ...ocResult.map])
}

export function generateConfigWithKey(input: GenerateConfigInput): string {
  const decryptedTokens = input.decryptedTokens ?? getDecryptedTokensOrThrow(input.ccData, input.cxData, input.ocData, input.keyPassphrase)
  const decryptedShellConfig = decryptShellVariables(input.shellConfig, input.keyPassphrase)
  const mcpServersData = input.mcpServersData ?? createEmptyMcpServersData()
  const ctx = createGenerateContext(
    input.shellType,
    input.keyPassphrase,
    input.proxyFunctionNames,
    decryptedShellConfig.pathVariables
  )
  return generateFullConfig(input.shellType, decryptedShellConfig, input.ccData, input.cxData, input.ocData, decryptedTokens, mcpServersData, ctx)
}

export function applyConfigWithKey(input: ApplyConfigInput): { appliedShells: ShellType[]; count: number } {
  const appliedShells: ShellType[] = []

  // opencode JSON config is shell-agnostic: decrypt once, write JSON once before the per-shell loop.
  // Only write when at least one shell is actually enabled, matching the per-shell scripts which
  // skip disabled shells (no enabled shell → nothing is applied, so nothing should be written).
  const decryptedTokens = getDecryptedTokensOrThrow(input.ccData, input.cxData, input.ocData, input.keyPassphrase)
  const mcpServersData = input.mcpServersData ?? createEmptyMcpServersData()
  const hasEnabledShell = input.shellTypes.some((shellType) => input.enabledShells[shellType]?.enabled)
  if (hasEnabledShell) {
    writeOCConfigFiles(buildOCConfigFiles(input.ocData, mcpServersData))

    // Write CC MCP config files for enabled, non-passthrough launch items
    const enabledProviderIds = new Set(input.ccData.providers.filter((p) => p.enabled).map((p) => p.id))
    const providerMap = new Map(input.ccData.providers.map((p) => [p.id, p]))
    const ccMcpInputs = input.ccData.launchItems
      .filter((item) => item.enabled && !item.passthrough && enabledProviderIds.has(item.providerId))
      .map((item) => {
        const provider = providerMap.get(item.providerId)!
        return {
          itemId: item.id,
          servers: resolveMcpServers(item, provider, mcpServersData.servers)
        }
      })
    writeCCMcpConfigFiles(buildCCMcpConfigFiles(ccMcpInputs))
  }

  for (const shellType of input.shellTypes) {
    const profile = input.enabledShells[shellType]
    if (!profile?.enabled) continue

    const outputPath = resolveHomePath(getShellOutputPath(shellType))

    // Clean up legacy files without extension (e.g. ~/.rcland/zshrc → ~/.rcland/zshrc.zsh)
    const legacyPath = resolveHomePath(`~/.rcland/${shellType}rc`)
    if (legacyPath !== outputPath && existsSync(legacyPath)) {
      unlinkSync(legacyPath)
    }
    input.createBackup?.(shellType, getShellOutputPath(shellType))
    const generated = generateConfigWithKey({ ...input, shellType, decryptedTokens })

    ensureParentDir(outputPath)
    // PowerShell on Windows requires UTF-8 BOM for correct encoding,
    // otherwise Windows PowerShell 5.1 defaults to system locale (e.g. GBK)
    const content = shellType === 'powershell' ? '﻿' + generated : generated
    writeFileSync(outputPath, content, 'utf-8')
    input.injectSourceBlock(shellType, outputPath)
    input.pruneBackups?.(shellType, 10)
    appliedShells.push(shellType)
  }

  return { appliedShells, count: appliedShells.length }
}
