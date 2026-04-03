import { ipcMain, BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as configService from './services/config'
import * as cryptoService from './services/crypto'
import { detectShell } from './services/shell-detector'
import { getGenerator } from './services/generators'
import type { CCLaunchData, Provider } from '../shared/types'
import type { ShellType } from '../shared/shell'

/** Build decrypted token map for all configs, returns { map, decryptFailed } */
function buildDecryptedMap(data: CCLaunchData, key: string): { map: Map<string, string>, decryptFailed: boolean } {
  const map = new Map<string, string>()
  let decryptFailed = false

  // Build provider lookup map
  const providerMap = new Map<string, Provider>()
  for (const provider of data.providers) {
    providerMap.set(provider.id, provider)
  }

  // Build key lookup map: `${providerId}:${keyId}` → token
  const keyTokenMap = new Map<string, string>()
  for (const provider of data.providers) {
    for (const k of provider.keys) {
      keyTokenMap.set(`${provider.id}:${k.id}`, k.token)
    }
  }

  for (const config of data.configs) {
    const tokenKey = `${config.providerId}:${config.keyId}`
    const encryptedToken = keyTokenMap.get(tokenKey)

    if (!encryptedToken || !cryptoService.isEncrypted(encryptedToken)) {
      map.set(`token:${config.id}`, '')
    } else {
      try {
        map.set(`token:${config.id}`, cryptoService.decrypt(encryptedToken, key))
      } catch {
        map.set(`token:${config.id}`, '')
        decryptFailed = true
      }
    }
  }
  return { map, decryptFailed }
}

export function registerIpcHandlers(): void {
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

  // ---- Crypto ----
  ipcMain.handle('crypto:initKey', (_e, passphrase?: string) => {
    const settings = configService.loadSettings()
    if (passphrase) {
      cryptoService.saveKey(settings.keyFilePath, passphrase)
    } else {
      cryptoService.initKey(settings.keyFilePath)
    }
  })

  ipcMain.handle('crypto:reencryptAll', async (_e, newPassphrase?: string) => {
    const settings = configService.loadSettings()
    const oldKey = cryptoService.loadKey(settings.keyFilePath)

    // Save new key first
    if (newPassphrase) {
      cryptoService.saveKey(settings.keyFilePath, newPassphrase)
    } else {
      cryptoService.initKey(settings.keyFilePath)
    }
    const newKey = cryptoService.loadKey(settings.keyFilePath)

    if (!oldKey || !newKey) return

    // Re-encrypt all keys in providers
    const dataJson = configService.loadData()
    if (!dataJson) return
    const data: CCLaunchData = JSON.parse(dataJson)

    for (const provider of data.providers) {
      for (const key of provider.keys) {
        if (key.token && cryptoService.isEncrypted(key.token)) {
          try {
            const plaintext = cryptoService.decrypt(key.token, oldKey)
            key.token = cryptoService.encrypt(plaintext, newKey)
          } catch {
            // Can't decrypt with old key, leave as-is
          }
        }
      }
    }

    configService.saveData(JSON.stringify(data))
  })

  ipcMain.handle('crypto:keyExists', () => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    return !!key
  })

  ipcMain.handle('crypto:encrypt', (_e, plaintext: string) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found or empty')
    return cryptoService.encrypt(plaintext, key)
  })

  ipcMain.handle('crypto:decrypt', (_e, ciphertext: string) => {
    const settings = configService.loadSettings()
    const key = cryptoService.loadKey(settings.keyFilePath)
    if (!key) throw new Error('Key file not found or empty')
    return cryptoService.decrypt(ciphertext, key)
  })

  /** Check if a key file exists at the given path */
  ipcMain.handle('crypto:keyExistsAtPath', (_e, keyFilePath: string) => {
    return cryptoService.keyFileExists(keyFilePath)
  })

  /** Migrate key file from old path to new path */
  ipcMain.handle('crypto:migrateKeyFile', (_e, oldPath: string, newPath: string) => {
    cryptoService.migrateKeyFile(oldPath, newPath)
  })

  /** Re-encrypt all data with a key from a specific path (for migration) */
  ipcMain.handle('crypto:reencryptWithKeyPath', (_e, oldKeyPath: string, newKeyPath: string, newPassphrase?: string) => {
    const oldKey = cryptoService.loadKey(oldKeyPath)
    if (!oldKey) throw new Error('无法读取旧密钥文件')

    // Save new key
    if (newPassphrase) {
      cryptoService.saveKey(newKeyPath, newPassphrase)
    } else {
      cryptoService.initKey(newKeyPath)
    }
    const newKey = cryptoService.loadKey(newKeyPath)
    if (!newKey) throw new Error('无法创建新密钥文件')

    // Re-encrypt all keys in providers
    const dataJson = configService.loadData()
    if (!dataJson) return { success: true, reencryptedCount: 0 }

    const data: CCLaunchData = JSON.parse(dataJson)
    let reencryptedCount = 0
    let failedCount = 0

    for (const provider of data.providers) {
      for (const key of provider.keys) {
        if (key.token && cryptoService.isEncrypted(key.token)) {
          try {
            const plaintext = cryptoService.decrypt(key.token, oldKey)
            key.token = cryptoService.encrypt(plaintext, newKey)
            reencryptedCount++
          } catch {
            failedCount++
          }
        }
      }
    }

    configService.saveData(JSON.stringify(data))
    return { success: true, reencryptedCount, failedCount }
  })

  // ---- Shell ----
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
      const outputPath = profile.outputPath.replace(/^~/, process.env.HOME || '~')
      writeFileSync(outputPath, generated, 'utf-8')

      // Source into profile
      if (profile.autoSource) {
        const profilePath = profile.profilePath.replace(/^~/, process.env.HOME || '~')
        if (existsSync(profilePath)) {
          const content = readFileSync(profilePath, 'utf-8')
          const beginMarker = gen.sourceMarkers.begin
          const endMarker = gen.sourceMarkers.end

          // Check if there's an uncommented source block
          const hasUncommentedBlock = new RegExp(
            `^${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            'm'
          ).test(content)

          // Check if there's a commented block (whole block is commented)
          const hasCommentedBlock = new RegExp(
            `^\\s*#\\s*${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            'm'
          ).test(content)

          if (!hasUncommentedBlock && !hasCommentedBlock) {
            // No block exists, add new one
            const sourceLine = gen.generateSourceLine(outputPath)
            writeFileSync(profilePath, content.trimEnd() + '\n\n' + sourceLine + '\n', 'utf-8')
          } else if (!hasUncommentedBlock && hasCommentedBlock) {
            // Block exists but is commented, uncomment it
            const lines = content.split('\n')
            const newLines: string[] = []
            let inCclandBlock = false

            for (const line of lines) {
              if (line.match(new RegExp(`^\\s*#\\s*${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))) {
                inCclandBlock = true
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else if (inCclandBlock && line.match(new RegExp(`^\\s*#\\s*${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))) {
                inCclandBlock = false
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else if (inCclandBlock) {
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else {
                newLines.push(line)
              }
            }
            writeFileSync(profilePath, newLines.join('\n'), 'utf-8')
          }
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

      const outputPath = profile.outputPath.replace(/^~/, process.env.HOME || '~')
      writeFileSync(outputPath, generated, 'utf-8')

      if (profile.autoSource) {
        const profilePath = profile.profilePath.replace(/^~/, process.env.HOME || '~')
        if (existsSync(profilePath)) {
          const content = readFileSync(profilePath, 'utf-8')
          const beginMarker = gen.sourceMarkers.begin
          const endMarker = gen.sourceMarkers.end

          const hasUncommentedBlock = new RegExp(
            `^${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            'm'
          ).test(content)

          const hasCommentedBlock = new RegExp(
            `^\\s*#\\s*${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            'm'
          ).test(content)

          if (!hasUncommentedBlock && !hasCommentedBlock) {
            const sourceLine = gen.generateSourceLine(outputPath)
            writeFileSync(profilePath, content.trimEnd() + '\n\n' + sourceLine + '\n', 'utf-8')
          } else if (!hasUncommentedBlock && hasCommentedBlock) {
            const lines = content.split('\n')
            const newLines: string[] = []
            let inCclandBlock = false

            for (const line of lines) {
              if (line.match(new RegExp(`^\\s*#\\s*${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))) {
                inCclandBlock = true
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else if (inCclandBlock && line.match(new RegExp(`^\\s*#\\s*${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))) {
                inCclandBlock = false
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else if (inCclandBlock) {
                newLines.push(line.replace(/^(\s*)#\s*/, '$1'))
              } else {
                newLines.push(line)
              }
            }
            writeFileSync(profilePath, newLines.join('\n'), 'utf-8')
          }
        }
      }
      appliedShells.push(shellType)
    }
    return { success: true, appliedShells, count: appliedShells.length }
  })

  // ---- File Dialogs ----
  ipcMain.handle('dialog:open', (_e, options: Electron.OpenDialogOptions) =>
    configService.showOpenDialog(BrowserWindow.getFocusedWindow(), options)
  )
  ipcMain.handle('dialog:save', (_e, options: Electron.SaveDialogOptions) =>
    configService.showSaveDialog(BrowserWindow.getFocusedWindow(), options)
  )
}
