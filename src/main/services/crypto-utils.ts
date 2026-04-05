import * as cryptoService from './crypto'
import type { CCLaunchData, Provider } from '@shared/types'
import type { ShellConfigData } from '@shared/shell-types'

/** Build decrypted token map for all configs, returns { map, decryptFailed } */
export function buildDecryptedMap(
  data: CCLaunchData,
  key: string
): { map: Map<string, string>; decryptFailed: boolean } {
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

/**
 * Decrypt encrypted shell variables in-place (on a deep-cloned copy).
 * Returns a new ShellConfigData with decrypted variable values.
 */
export function decryptShellVariables(shellConfig: ShellConfigData, key: string): ShellConfigData {
  const decrypted = JSON.parse(JSON.stringify(shellConfig)) as ShellConfigData
  for (const v of decrypted.variables) {
    if (v.encrypted && cryptoService.isEncrypted(v.value)) {
      try {
        v.value = cryptoService.decrypt(v.value, key)
        v.encrypted = false
      } catch {
        // Leave as-is if decryption fails
      }
    }
  }
  return decrypted
}
