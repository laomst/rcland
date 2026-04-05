import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100_000
const ENCRYPTED_PREFIX = 'enc:v1:'
const SALT_LENGTH = 16

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}

export function encrypt(plaintext: string, passphrase: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(passphrase, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  const payload = Buffer.concat([salt, iv, authTag, encrypted])
  return ENCRYPTED_PREFIX + payload.toString('base64')
}

export function decrypt(ciphertext: string, passphrase: string): string {
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('Invalid encrypted value: missing prefix')
  }

  const payload = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), 'base64')

  let offset = 0
  const salt = payload.subarray(offset, offset + SALT_LENGTH); offset += SALT_LENGTH
  const iv = payload.subarray(offset, offset + IV_LENGTH); offset += IV_LENGTH
  const authTag = payload.subarray(offset, offset + AUTH_TAG_LENGTH); offset += AUTH_TAG_LENGTH
  const encrypted = payload.subarray(offset)

  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted) + decipher.final('utf8')
}

export function loadKey(keyFilePath: string): string | null {
  if (!existsSync(keyFilePath)) return null
  return readFileSync(keyFilePath, 'utf-8').trim()
}

export function saveKey(keyFilePath: string, passphrase: string): void {
  const dir = dirname(keyFilePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(keyFilePath, passphrase, 'utf-8')
}

export function initKey(keyFilePath: string): void {
  const passphrase = randomBytes(32).toString('hex')
  saveKey(keyFilePath, passphrase)
}

export function reencryptAll(
  values: string[],
  oldPassphrase: string,
  newPassphrase: string
): string[] {
  return values.map((v) => {
    if (!isEncrypted(v)) return v
    const plaintext = decrypt(v, oldPassphrase)
    return encrypt(plaintext, newPassphrase)
  })
}

/** Check if a key file exists at the given path */
export function keyFileExists(keyFilePath: string): boolean {
  return existsSync(keyFilePath)
}

/** Migrate key file from old path to new path */
export function migrateKeyFile(oldPath: string, newPath: string): void {
  if (!existsSync(oldPath)) {
    throw new Error(`源密钥文件不存在: ${oldPath}`)
  }
  const key = readFileSync(oldPath, 'utf-8').trim()
  saveKey(newPath, key)
}
