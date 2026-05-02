import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { ShellType } from '@shared/shell'
import { getShellOutputPath } from '@shared/shell'
import type { CCLaunchData, CXLandData } from '@shared/types'
import type { ShellConfigData } from '@shared/shell-types'
import { buildDecryptedMap, buildCXDecryptedMap, decryptShellVariables } from './crypto-utils'
import { createGenerateContext } from './generators/context'
import { generateFullConfig } from './generators/orchestrator'
import { resolveHomePath } from './path-utils'

export interface GenerateConfigInput {
  shellType: ShellType
  ccData: CCLaunchData
  cxData: CXLandData
  shellConfig: ShellConfigData
  keyPassphrase: string
  decryptedTokens?: Map<string, string>
  proxyFunctionNames?: { proxyOn: string; proxyOff: string; proxyStatus: string }
}

export interface ApplyConfigInput {
  shellTypes: ShellType[]
  ccData: CCLaunchData
  cxData: CXLandData
  shellConfig: ShellConfigData
  keyPassphrase: string
  proxyFunctionNames?: { proxyOn: string; proxyOff: string; proxyStatus: string }
  enabledShells: Partial<Record<ShellType, { enabled: boolean }>>
  injectSourceBlock: (shellType: ShellType, outputPath: string) => void
  createBackup?: (shellType: ShellType, outputPath: string) => void
  pruneBackups?: (shellType: ShellType, keepCount: number) => void
}

function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function getDecryptedTokensOrThrow(ccData: CCLaunchData, cxData: CXLandData, keyPassphrase: string): Map<string, string> {
  const ccResult = buildDecryptedMap(ccData, keyPassphrase)
  const cxResult = buildCXDecryptedMap(cxData, keyPassphrase)
  if (ccResult.decryptFailed || cxResult.decryptFailed) throw new Error('DECRYPT_FAILED')
  return new Map<string, string>([...ccResult.map, ...cxResult.map])
}

export function generateConfigWithKey(input: GenerateConfigInput): string {
  const decryptedTokens = input.decryptedTokens ?? getDecryptedTokensOrThrow(input.ccData, input.cxData, input.keyPassphrase)
  const decryptedShellConfig = decryptShellVariables(input.shellConfig, input.keyPassphrase)
  const ctx = createGenerateContext(
    input.shellType,
    input.keyPassphrase,
    input.proxyFunctionNames,
    decryptedShellConfig.pathVariables
  )
  return generateFullConfig(input.shellType, decryptedShellConfig, input.ccData, input.cxData, decryptedTokens, ctx)
}

export function applyConfigWithKey(input: ApplyConfigInput): { appliedShells: ShellType[]; count: number } {
  const appliedShells: ShellType[] = []

  for (const shellType of input.shellTypes) {
    const profile = input.enabledShells[shellType]
    if (!profile?.enabled) continue

    const outputPath = resolveHomePath(getShellOutputPath(shellType))
    input.createBackup?.(shellType, getShellOutputPath(shellType))
    const generated = generateConfigWithKey({ ...input, shellType })

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
