import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as configService from '../services/config'
import * as cryptoService from '../services/crypto'
import * as backupService from '../services/backup'
import * as shellConfigService from '../services/shell-config'
import { buildDecryptedMap, decryptShellVariables } from '../services/crypto-utils'
import { detectShell } from '../services/shell-detector'
import { getGenerator } from '../services/generators'
import { generateFullConfig } from '../services/generators/orchestrator'
import { createGenerateContext } from '../services/generators/context'
import type { CCLaunchData } from '@shared/types'
import { getShellOutputPath, getShellProfilePath, type ShellType } from '@shared/shell'

/**
 * Remove a marker block (begin/end markers + one source line between them) from shell profile content.
 * Throws if the block contains more than one line between markers (user must fix manually).
 */
function removeMarkerBlock(content: string, beginMarker: string, endMarker: string, filePath?: string): string {
  const beginIdx = content.indexOf(beginMarker)
  if (beginIdx === -1) return content

  const endIdx = content.indexOf(endMarker, beginIdx)
  if (endIdx === -1) return content

  const between = content.substring(beginIdx + beginMarker.length, endIdx).trim()
  const linesBetween = between.split('\n').filter((l) => l.trim().length > 0)
  if (linesBetween.length > 1) {
    throw new Error(
      `${filePath || 'Shell profile'} 中 "${beginMarker}" 标记块内包含多行内容，请手动清理后重试`
    )
  }

  // Remove the block including surrounding blank lines
  const before = content.substring(0, beginIdx).replace(/\n+$/, '')
  const after = content.substring(endIdx + endMarker.length).replace(/^\n+/, '')
  return before + (before && after ? '\n' : '') + after
}

/**
 * Inject RCLand source block at the top of a shell profile file.
 * Removes legacy CCland blocks and existing RCLand blocks first.
 */
function injectSourceBlock(profilePath: string, outputPath: string): void {
  let content = readFileSync(profilePath, 'utf-8')
  content = removeMarkerBlock(content, '# >>> CCland >>>', '# <<< CCland <<<', profilePath)
  content = removeMarkerBlock(content, '# >>> RCLand >>>', '# <<< RCLand <<<', profilePath)
  const sourceBlock = `# >>> RCLand >>>\nsource ${outputPath}\n# <<< RCLand <<<`
  writeFileSync(profilePath, sourceBlock + '\n\n' + content.trimStart(), 'utf-8')
}

export function registerShellHandlers(): void {
  ipcMain.handle('shell:detect', () => detectShell())

  ipcMain.handle('shell:generate', (_e, shellType: ShellType) => {
    const settings = configService.loadSettings()
    const dataJson = configService.loadData()
    if (!dataJson) throw new Error('No data file found')
    const data: CCLaunchData = JSON.parse(dataJson)

    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')

    const { map: decryptedMap, decryptFailed } = buildDecryptedMap(data, key)
    if (decryptFailed) {
      throw new Error('DECRYPT_FAILED')
    }
    const gen = getGenerator(shellType)
    const values = { get: (k: string) => decryptedMap.get(k) ?? '' }
    return gen.generate(data, values)
  })

  ipcMain.handle('shell:apply', async (_e, shellTypes: ShellType[]) => {
    const settings = configService.loadSettings()
    const dataJson = configService.loadData()
    if (!dataJson) throw new Error('No data file found')
    const data: CCLaunchData = JSON.parse(dataJson)

    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')

    const { map: decryptedMap, decryptFailed } = buildDecryptedMap(data, key)
    if (decryptFailed) {
      throw new Error('DECRYPT_FAILED')
    }

    const appliedShells: string[] = []
    for (const shellType of shellTypes) {
      const profile = settings.shellProfiles[shellType]
      if (!profile) continue

      const gen = getGenerator(shellType)
      const values = { get: (k: string) => decryptedMap.get(k) ?? '' }
      const generated = gen.generate(data, values)

      // Write output
      const outputPath = getShellOutputPath(shellType).replace(/^~/, process.env.HOME || '~')
      writeFileSync(outputPath, generated, 'utf-8')

      // Auto source into profile
      {
        const profilePath = getShellProfilePath(shellType).replace(/^~/, process.env.HOME || '~')
        if (existsSync(profilePath)) {
          injectSourceBlock(profilePath, outputPath)
        }
      }
      appliedShells.push(shellType)
    }
    return { appliedShells, count: appliedShells.length }
  })

  ipcMain.handle('shell:tryApplyWithKey', async (_e, shellTypes: ShellType[], tempKey: string) => {
    const settings = configService.loadSettings()
    const dataJson = configService.loadData()
    if (!dataJson) {
      throw new Error('No data file found')
    }
    const data: CCLaunchData = JSON.parse(dataJson)

    const { map: decryptedMap, decryptFailed } = buildDecryptedMap(data, tempKey)
    if (decryptFailed) {
      return { success: false, error: 'DECRYPT_FAILED' }
    }

    const appliedShells: ShellType[] = []
    for (const shellType of shellTypes) {
      const profile = settings.shellProfiles[shellType]
      if (!profile) continue

      const gen = getGenerator(shellType)
      const values = { get: (k: string) => decryptedMap.get(k) ?? '' }
      const generated = gen.generate(data, values)

      const outputPath = getShellOutputPath(shellType).replace(/^~/, process.env.HOME || '~')
      writeFileSync(outputPath, generated, 'utf-8')

      {
        const profilePath = getShellProfilePath(shellType).replace(/^~/, process.env.HOME || '~')
        if (existsSync(profilePath)) {
          injectSourceBlock(profilePath, outputPath)
        }
      }
      appliedShells.push(shellType)
    }
    return { success: true, appliedShells, count: appliedShells.length }
  })

  // ---- Unified Generate (shell config + CC config merged) ----
  ipcMain.handle('shell:generateAll', (_e, shellType: ShellType) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')
    // Load CC data
    const ccDataJson = configService.loadData()
    const ccData: CCLaunchData = ccDataJson ? JSON.parse(ccDataJson) : { version: 5, providers: [], configs: [], selector: { enabled: false, funcName: 'cc', promptTitle: '' } }
    // Load Shell config
    const shellConfigJson = shellConfigService.loadShellConfig()
    const shellConfig: import('../../shared/shell-types').ShellConfigData = JSON.parse(shellConfigJson)
    // Build decrypted tokens
    const { map: decryptedTokens, decryptFailed } = buildDecryptedMap(ccData, key)
    if (decryptFailed) throw new Error('DECRYPT_FAILED')
    // Decrypt encrypted shell variables (in-memory only)
    const decryptedShellConfig = decryptShellVariables(shellConfig, key)
    const ctx = createGenerateContext(shellType, key)
    return generateFullConfig(shellType, decryptedShellConfig, ccData, decryptedTokens, ctx)
  })

  ipcMain.handle('shell:applyAll', async (_e, shellTypes: ShellType[]) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')
    const ccDataJson = configService.loadData()
    const ccData: CCLaunchData = ccDataJson ? JSON.parse(ccDataJson) : { version: 5, providers: [], configs: [], selector: { enabled: false, funcName: 'cc', promptTitle: '' } }
    const shellConfigJson = shellConfigService.loadShellConfig()
    const shellConfig: import('../../shared/shell-types').ShellConfigData = JSON.parse(shellConfigJson)
    const { map: decryptedTokens, decryptFailed } = buildDecryptedMap(ccData, key)
    if (decryptFailed) throw new Error('DECRYPT_FAILED')
    // Decrypt encrypted shell variables (in-memory only)
    const decryptedShellConfig = decryptShellVariables(shellConfig, key)
    const appliedShells: string[] = []
    const home = process.env.HOME || '~'
    for (const shellType of shellTypes) {
      const profile = settings.shellProfiles[shellType]
      if (!profile) continue
      const outputPath = getShellOutputPath(shellType).replace(/^~/, home)
      const profilePath = getShellProfilePath(shellType).replace(/^~/, home)
      // Backup current output file
      backupService.createBackup(shellType, getShellOutputPath(shellType))
      // Generate
      const ctx = createGenerateContext(shellType, key)
      const generated = generateFullConfig(shellType, decryptedShellConfig, ccData, decryptedTokens, ctx)
      // Write output
      writeFileSync(outputPath, generated, 'utf-8')
      // Auto source into shell profile
      if (existsSync(profilePath)) {
        injectSourceBlock(profilePath, outputPath)
      }
      // Prune old backups
      backupService.pruneBackups(shellType, 10)
      appliedShells.push(shellType)
    }
    return { appliedShells, count: appliedShells.length }
  })
}
