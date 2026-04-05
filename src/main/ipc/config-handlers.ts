import { ipcMain, BrowserWindow } from 'electron'
import * as configService from '../services/config'
import * as shellConfigService from '../services/shell-config'
import * as backupService from '../services/backup'
import * as conflictChecker from '../services/conflict-checker'
import type { ShellType } from '@shared/shell'

export function registerConfigHandlers(): void {
  // ---- Config ----
  ipcMain.handle('config:getDir', () => configService.getConfigDir())
  ipcMain.handle('config:setDir', (_e, dir: string) => configService.setConfigDir(dir))

  // ---- Settings ----
  ipcMain.handle('settings:load', () => {
    return JSON.stringify(configService.loadSettings())
  })
  ipcMain.handle('settings:save', (_e, json: string) => {
    configService.saveSettings(JSON.parse(json))
  })

  // ---- Data ----
  ipcMain.handle('data:load', () => configService.loadData())
  ipcMain.handle('data:save', (_e, json: string) => configService.saveData(json))

  // ---- File Dialogs ----
  ipcMain.handle('dialog:open', (_e, options: Electron.OpenDialogOptions) =>
    configService.showOpenDialog(BrowserWindow.getFocusedWindow(), options)
  )
  ipcMain.handle('dialog:save', (_e, options: Electron.SaveDialogOptions) =>
    configService.showSaveDialog(BrowserWindow.getFocusedWindow(), options)
  )

  // ---- Shell Config ----
  ipcMain.handle('shell-config:load', () => shellConfigService.loadShellConfig())
  ipcMain.handle('shell-config:save', (_e, json: string) => shellConfigService.saveShellConfig(json))

  // ---- Conflict Check ----
  ipcMain.handle('shell-config:checkConflicts', (_e, json: string) => {
    const config: import('../../shared/shell-types').ShellConfigData = JSON.parse(json)
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
