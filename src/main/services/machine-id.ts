import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const MACHINE_ID_FILENAME = 'machine-id.json'

function getLocalDir(): string {
  return join(app.getPath('home'), '.rcland', 'local_config')
}

export function getMachineIdPath(): string {
  return join(getLocalDir(), MACHINE_ID_FILENAME)
}

/** 读取本机 machineId；文件不存在或损坏返回 null（触发首次启动认领） */
export function readMachineId(): string | null {
  const p = getMachineIdPath()
  if (!existsSync(p)) return null
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8'))
    return typeof parsed.machineId === 'string' && parsed.machineId ? parsed.machineId : null
  } catch {
    return null
  }
}

/** 写入本机 machineId（认领时调用）。永不同步。 */
export function writeMachineId(machineId: string): void {
  const dir = getLocalDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getMachineIdPath(), JSON.stringify({ machineId }, null, 2), 'utf-8')
}
