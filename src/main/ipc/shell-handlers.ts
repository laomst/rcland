import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import * as configService from '../services/config'
import * as cryptoService from '../services/crypto'
import * as backupService from '../services/backup'
import * as shellConfigService from '../services/shell-config'
import { detectShell } from '../services/shell-detector'
import { quoteBashLikeLiteral, quotePowerShellLiteral } from '../services/generators/shell-syntax'
import { applyConfigWithKey, generateConfigWithKey } from '../services/shell-apply'
import { resolveHomePath } from '../services/path-utils'
import { DEFAULT_PROXY_FUNCTION_NAMES, type CCLaunchData } from '@shared/types'
import type { ShellConfigData } from '@shared/shell-types'
import { getShellProfilePath, type ShellType } from '@shared/shell'

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
function injectSourceBlock(profilePath: string, outputPath: string, shellType: ShellType): void {
  let content = readFileSync(profilePath, 'utf-8')
  content = removeMarkerBlock(content, '# >>> CCland >>>', '# <<< CCland <<<', profilePath)
  content = removeMarkerBlock(content, '# >>> RCLand >>>', '# <<< RCLand <<<', profilePath)
  // PowerShell uses dot-sourcing (. "path"), others use source
  const sourceLine = shellType === 'powershell'
    ? `. ${quotePowerShellLiteral(outputPath)}`
    : `source ${quoteBashLikeLiteral(outputPath)}`
  const sourceBlock = `# >>> RCLand >>>\n${sourceLine}\n# <<< RCLand <<<`
  writeFileSync(profilePath, sourceBlock + '\n\n' + content.trimStart(), 'utf-8')
}

function getResolvedProfilePath(shellType: ShellType): string {
  if (shellType === 'powershell') {
    const documents = app.getPath('documents')
    const candidates = [
      join(documents, 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
      join(documents, 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1')
    ]
    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
  }
  return resolveHomePath(getShellProfilePath(shellType))
}

function defaultCCData(): CCLaunchData {
  return {
    version: 5,
    providers: [],
    launchItems: [],
    selector: { funcName: 'cc', promptTitle: '' }
  }
}

function loadCCDataOrDefault(): CCLaunchData {
  return configService.loadCCData() ?? defaultCCData()
}

function loadCXData(): ReturnType<typeof configService.loadCXLandData> {
  return configService.loadCXLandData()
}

function loadShellConfigData(): ShellConfigData {
  return shellConfigService.loadShellConfigData()
}

function injectGeneratedSource(shellType: ShellType, outputPath: string): void {
  const profilePath = getResolvedProfilePath(shellType)
  if (!existsSync(profilePath)) {
    mkdirSync(dirname(profilePath), { recursive: true })
    writeFileSync(profilePath, '', 'utf-8')
  }
  injectSourceBlock(profilePath, outputPath, shellType)
}

function validateProxyFunctionNames(names: { proxyOn: string; proxyOff: string; proxyStatus: string }): void {
  if (!names.proxyOn.trim() || !names.proxyOff.trim() || !names.proxyStatus.trim()) {
    throw new Error('PROXY_FUNC_NAME_EMPTY')
  }
}

export function registerShellHandlers(): void {
  ipcMain.handle('shell:detect', () => detectShell())

  ipcMain.handle('shell:tryApplyWithKey', async (_e, shellTypes: ShellType[], tempKey: string) => {
    const settings = configService.loadSettings()
    const proxyFunctionNames = settings.proxyFunctionNames ?? DEFAULT_PROXY_FUNCTION_NAMES
    validateProxyFunctionNames(proxyFunctionNames)
    try {
      const result = applyConfigWithKey({
        shellTypes,
        ccData: loadCCDataOrDefault(),
        cxData: loadCXData(),
        shellConfig: loadShellConfigData(),
        keyPassphrase: tempKey,
        proxyFunctionNames,
        enabledShells: settings.shellProfiles,
        injectSourceBlock: injectGeneratedSource,
        createBackup: backupService.createBackup,
        pruneBackups: backupService.pruneBackups
      })
      return { success: true, ...result }
    } catch (err) {
      if (err instanceof Error && (err.message === 'DECRYPT_FAILED' || err.message === 'PROXY_FUNC_NAME_EMPTY')) {
        return { success: false, error: err.message }
      }
      throw err
    }
  })

  // ---- Unified Generate (shell config + CC config merged) ----
  ipcMain.handle('shell:generateAll', (_e, shellType: ShellType) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')
    const proxyFunctionNames = settings.proxyFunctionNames ?? DEFAULT_PROXY_FUNCTION_NAMES
    validateProxyFunctionNames(proxyFunctionNames)
    return generateConfigWithKey({
      shellType,
      ccData: loadCCDataOrDefault(),
      cxData: loadCXData(),
      shellConfig: loadShellConfigData(),
      keyPassphrase: key,
      proxyFunctionNames
    })
  })

  ipcMain.handle('shell:applyAll', async (_e, shellTypes: ShellType[]) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found')
    const proxyFunctionNames = settings.proxyFunctionNames ?? DEFAULT_PROXY_FUNCTION_NAMES
    validateProxyFunctionNames(proxyFunctionNames)
    return applyConfigWithKey({
      shellTypes,
      ccData: loadCCDataOrDefault(),
      cxData: loadCXData(),
      shellConfig: loadShellConfigData(),
      keyPassphrase: key,
      proxyFunctionNames,
      enabledShells: settings.shellProfiles,
      injectSourceBlock: injectGeneratedSource,
      createBackup: backupService.createBackup,
      pruneBackups: backupService.pruneBackups
    })
  })
}
