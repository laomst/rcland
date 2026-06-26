import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { hostname, platform } from 'os'
import { readMachineId, writeMachineId } from '../services/machine-id'
import { loadMachines, saveMachines, upsertMachine } from '../services/machines-config'
import type { Machine } from '@shared/types'

function currentOs(): Machine['os'] {
  const p = platform()
  if (p === 'darwin' || p === 'win32') return p
  return 'linux'
}

export function registerMachinesHandlers(): void {
  // 启动状态：是否已认领 + 机器列表
  ipcMain.handle('machine:status', () => {
    const machineId = readMachineId()
    if (machineId === null) {
      return { claimed: false, machineId: null, machines: loadMachines().machines }
    }
    // 已认领：刷新本机记录（保留 name）
    const updated = upsertMachine(loadMachines(), {
      id: machineId, os: currentOs(), hostname: hostname(), now: Date.now()
    })
    saveMachines(updated)
    return { claimed: true, machineId, machines: updated.machines }
  })

  // 列表
  ipcMain.handle('machine:list', () => loadMachines().machines)

  // 认领：new=生成新 id 并追加；adopt=复用旧 id 仅更新
  ipcMain.handle('machine:claim', (_e, mode: 'new' | 'adopt', adoptId?: string) => {
    const machineId = mode === 'adopt' && adoptId ? adoptId : randomUUID()
    writeMachineId(machineId)
    const now = Date.now()
    const updated = upsertMachine(loadMachines(), { id: machineId, os: currentOs(), hostname: hostname(), now })
    saveMachines(updated)
    return { machineId }
  })

  // 改名/编辑（更新已有记录）
  ipcMain.handle('machine:update', (_e, machine: Machine) => {
    const data = loadMachines()
    const updated = { ...data, machines: data.machines.map((m) => (m.id === machine.id ? machine : m)) }
    saveMachines(updated)
    return updated.machines
  })

  // 删除（仅从列表移除，不级联清理配置项引用）
  ipcMain.handle('machine:delete', (_e, id: string) => {
    const data = loadMachines()
    const updated = { ...data, machines: data.machines.filter((m) => m.id !== id) }
    saveMachines(updated)
    return updated.machines
  })
}
