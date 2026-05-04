import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, copyFileSync } from 'fs'
import { resolveHomePath } from './path-utils'
import type { ShellType } from '@shared/shell'
import type { BackupEntry } from '@shared/shell-types'

function getBackupDir(shellType: ShellType): string {
  return join(homedir(), '.rcland', 'backups', shellType)
}

function ensureBackupDir(shellType: ShellType): string {
  const dir = getBackupDir(shellType)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Create a backup of the current output file before applying */
export function createBackup(shellType: ShellType, outputPath: string): string | null {
  const resolved = resolveHomePath(outputPath)
  if (!existsSync(resolved)) return null

  const dir = ensureBackupDir(shellType)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const ext = shellType === 'powershell' ? '.ps1' : shellType === 'bash' ? '.sh' : '.zsh'
  const backupFileName = `${timestamp}${ext}.bak`
  const backupPath = join(dir, backupFileName)

  copyFileSync(resolved, backupPath)
  return backupPath
}

/** List all backups for a shell type, sorted newest first */
export function listBackups(shellType: ShellType): BackupEntry[] {
  const dir = getBackupDir(shellType)
  if (!existsSync(dir)) return []

  const files = readdirSync(dir).filter((f) => f.endsWith('.bak')).sort().reverse()
  return files.map((f) => {
    const fullPath = join(dir, f)
    const stats = statSync(fullPath)
    return {
      id: f,
      shellType,
      timestamp: f.split('.')[0],
      filePath: fullPath,
      originalPath: '',
      sizeBytes: stats.size
    }
  })
}

/** Restore a backup file to its original output path */
export function restoreBackup(shellType: ShellType, backupId: string, outputPath: string): void {
  const dir = getBackupDir(shellType)
  const backupPath = join(dir, backupId)
  if (!existsSync(backupPath)) throw new Error(`Backup not found: ${backupId}`)
  const resolved = resolveHomePath(outputPath)
  copyFileSync(backupPath, resolved)
}

/** Remove old backups, keeping only the N most recent */
export function pruneBackups(shellType: ShellType, keepCount: number): void {
  const dir = getBackupDir(shellType)
  if (!existsSync(dir)) return

  const files = readdirSync(dir).filter((f) => f.endsWith('.bak')).sort().reverse()
  const toDelete = files.slice(keepCount)
  for (const f of toDelete) {
    unlinkSync(join(dir, f))
  }
}
