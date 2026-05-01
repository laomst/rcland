import { ipcMain } from 'electron'
import * as configService from '../services/config'
import * as cryptoService from '../services/crypto'

export function registerCryptoHandlers(): void {
  ipcMain.handle('crypto:initKey', (_e, passphrase?: string) => {
    const settings = configService.loadSettings()
    if (passphrase) {
      cryptoService.saveKey(settings.keyFilePath, passphrase)
    } else {
      cryptoService.initKey(settings.keyFilePath)
    }
  })

  ipcMain.handle('crypto:initKeyAtPath', (_e, keyFilePath: string, passphrase?: string) => {
    if (passphrase) {
      cryptoService.saveKey(keyFilePath, passphrase)
    } else {
      cryptoService.initKey(keyFilePath)
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
    const data = configService.loadCCData()
    if (!data) return

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

    configService.saveCCData(data)
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
    const data = configService.loadCCData()
    if (!data) return { success: true, reencryptedCount: 0 }
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

    configService.saveCCData(data)
    return { success: true, reencryptedCount, failedCount }
  })
}
