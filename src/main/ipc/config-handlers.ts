import { ipcMain, BrowserWindow } from 'electron'
import * as configService from '../services/config'
import * as shellConfigService from '../services/shell-config'
import * as backupService from '../services/backup'
import * as conflictChecker from '../services/conflict-checker'
import type { ShellType } from '@shared/shell'
import type { AppSettings, CCLaunchData, CXLandData } from '@shared/types'
import type { ShellConfigData } from '@shared/shell-types'

export function registerConfigHandlers(): void {
  // ---- Config ----
  ipcMain.handle('config:getDir', () => configService.getConfigDir())
  ipcMain.handle('config:setDir', (_e, dir: string) => configService.setConfigDir(dir))

  // ---- Settings ----
  ipcMain.handle('settings:load', () => {
    return configService.loadSettings()
  })
  ipcMain.handle('settings:save', (_e, settings: AppSettings) => {
    configService.saveSettings(settings)
  })

  // ---- Data ----
  ipcMain.handle('data:load', () => configService.loadCCData())
  ipcMain.handle('data:save', (_e, data: CCLaunchData) => configService.saveCCData(data))
  ipcMain.handle('cxland:load', () => configService.loadCXLandData())
  ipcMain.handle('cxland:save', (_e, data: CXLandData) => configService.saveCXLandData(data))

  // ---- File Dialogs ----
  ipcMain.handle('dialog:open', (_e, options: Electron.OpenDialogOptions) =>
    configService.showOpenDialog(BrowserWindow.getFocusedWindow(), options)
  )
  ipcMain.handle('dialog:save', (_e, options: Electron.SaveDialogOptions) =>
    configService.showSaveDialog(BrowserWindow.getFocusedWindow(), options)
  )

  // ---- Shell Config ----
  ipcMain.handle('shell-config:load', () => shellConfigService.loadShellConfigData())
  ipcMain.handle('shell-config:save', (_e, data: ShellConfigData) => shellConfigService.saveShellConfigData(data))

  // ---- Conflict Check ----
  ipcMain.handle('shell-config:checkConflicts', (_e, config: ShellConfigData) => {
    return conflictChecker.checkConflicts(config)
  })

  // ---- Backup ----
  ipcMain.handle('backup:create', (_e, shellType: ShellType, outputPath: string) =>
    backupService.createBackup(shellType, outputPath)
  )
  ipcMain.handle('backup:list', (_e, shellType: ShellType) =>
    backupService.listBackups(shellType)
  )
  ipcMain.handle('backup:restore', (_e, shellType: ShellType, backupId: string, outputPath: string) =>
    backupService.restoreBackup(shellType, backupId, outputPath)
  )
  ipcMain.handle('backup:prune', (_e, shellType: ShellType, keepCount: number) =>
    backupService.pruneBackups(shellType, keepCount)
  )
}
