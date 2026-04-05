import { contextBridge, ipcRenderer } from 'electron'
import type { ShellType } from '@shared/shell'

export interface ElectronAPI {
  // Config
  getConfigDir: () => Promise<string>
  setConfigDir: (dir: string) => Promise<void>

  // Data
  loadData: () => Promise<string | null>
  saveData: (json: string) => Promise<void>

  // Settings
  loadSettings: () => Promise<string | null>
  saveSettings: (json: string) => Promise<void>

  // Crypto
  initKey: (passphrase?: string) => Promise<void>
  reencryptAll: (newPassphrase?: string) => Promise<void>
  keyExists: () => Promise<boolean>
  keyExistsAtPath: (keyFilePath: string) => Promise<boolean>
  migrateKeyFile: (oldPath: string, newPath: string) => Promise<void>
  reencryptWithKeyPath: (oldKeyPath: string, newKeyPath: string, newPassphrase?: string) => Promise<{ success: boolean; reencryptedCount: number; failedCount: number }>
  encrypt: (plaintext: string) => Promise<string>
  decrypt: (ciphertext: string) => Promise<string>

  // Shell
  detectShell: () => Promise<string>
  generateConfig: (shellType: ShellType) => Promise<string>
  applyConfig: (shellTypes: ShellType[]) => Promise<{ appliedShells: ShellType[]; count: number }>
  tryApplyWithKey: (shellTypes: ShellType[], tempKey: string) => Promise<{ success: boolean; appliedShells?: ShellType[]; count?: number; error?: string }>

  // Shell Config
  loadShellConfig: () => Promise<string>
  saveShellConfig: (json: string) => Promise<void>
  checkConflicts: (json: string) => Promise<{ warnings: any[]; errors: any[] }>

  // Backup
  createBackup: (shellType: ShellType, outputPath: string) => Promise<string | null>
  listBackups: (shellType: ShellType) => Promise<any[]>
  restoreBackup: (shellType: ShellType, backupId: string, outputPath: string) => Promise<void>
  pruneBackups: (shellType: ShellType, keepCount: number) => Promise<void>

  // Unified Generate
  generateAllConfig: (shellType: ShellType) => Promise<string>
  applyAllConfig: (shellTypes: ShellType[]) => Promise<{ appliedShells: ShellType[]; count: number }>

  // File dialog
  showOpenDialog: (options: { title: string; defaultPath?: string; properties?: string[] }) => Promise<string | null>
  showSaveDialog: (options: { title: string; defaultPath?: string }) => Promise<string | null>

  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => void
}

const api: ElectronAPI = {
  getConfigDir: () => ipcRenderer.invoke('config:getDir'),
  setConfigDir: (dir) => ipcRenderer.invoke('config:setDir', dir),
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (json) => ipcRenderer.invoke('data:save', json),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (json) => ipcRenderer.invoke('settings:save', json),
  initKey: (passphrase?) => ipcRenderer.invoke('crypto:initKey', passphrase),
  reencryptAll: (newPassphrase?) => ipcRenderer.invoke('crypto:reencryptAll', newPassphrase),
  keyExists: () => ipcRenderer.invoke('crypto:keyExists'),
  keyExistsAtPath: (keyFilePath) => ipcRenderer.invoke('crypto:keyExistsAtPath', keyFilePath),
  migrateKeyFile: (oldPath, newPath) => ipcRenderer.invoke('crypto:migrateKeyFile', oldPath, newPath),
  reencryptWithKeyPath: (oldKeyPath, newKeyPath, newPassphrase?) => ipcRenderer.invoke('crypto:reencryptWithKeyPath', oldKeyPath, newKeyPath, newPassphrase),
  encrypt: (plaintext) => ipcRenderer.invoke('crypto:encrypt', plaintext),
  decrypt: (ciphertext) => ipcRenderer.invoke('crypto:decrypt', ciphertext),
  detectShell: () => ipcRenderer.invoke('shell:detect'),
  generateConfig: (shellType) => ipcRenderer.invoke('shell:generate', shellType),
  applyConfig: (shellTypes) => ipcRenderer.invoke('shell:apply', shellTypes),
  tryApplyWithKey: (shellTypes, tempKey) => ipcRenderer.invoke('shell:tryApplyWithKey', shellTypes, tempKey),
  loadShellConfig: () => ipcRenderer.invoke('shell-config:load'),
  saveShellConfig: (json) => ipcRenderer.invoke('shell-config:save', json),
  checkConflicts: (json) => ipcRenderer.invoke('shell-config:checkConflicts', json),
  createBackup: (shellType, outputPath) => ipcRenderer.invoke('backup:create', shellType, outputPath),
  listBackups: (shellType) => ipcRenderer.invoke('backup:list', shellType),
  restoreBackup: (shellType, backupId, outputPath) => ipcRenderer.invoke('backup:restore', shellType, backupId, outputPath),
  pruneBackups: (shellType, keepCount) => ipcRenderer.invoke('backup:prune', shellType, keepCount),
  generateAllConfig: (shellType) => ipcRenderer.invoke('shell:generateAll', shellType),
  applyAllConfig: (shellTypes) => ipcRenderer.invoke('shell:applyAll', shellTypes),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
