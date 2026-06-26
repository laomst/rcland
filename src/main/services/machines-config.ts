import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { Machine, MachinesData } from '@shared/types'
import { createEmptyMachinesData } from '@shared/types'

const MACHINES_FILENAME = 'rcland.config.machines.json'

function getMachinesPath(): string {
  // Lazy-load to avoid bundling electron with tests that don't call this
  const { loadSettings } = require('./config')
  return join(loadSettings().configDir, MACHINES_FILENAME)
}

export function loadMachines(): MachinesData {
  const p = getMachinesPath()
  if (!existsSync(p)) return createEmptyMachinesData()
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8'))
    if (parsed.version === 1 && Array.isArray(parsed.machines)) return parsed
    return createEmptyMachinesData()
  } catch {
    return createEmptyMachinesData()
  }
}

export function saveMachines(data: MachinesData): void {
  // Lazy-load to avoid bundling electron with tests that don't call this
  const { loadSettings } = require('./config')
  const dir = loadSettings().configDir
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getMachinesPath(), JSON.stringify(data, null, 2), 'utf-8')
}

/** 纯函数：upsert 本机记录，返回新对象不改入参 */
export function upsertMachine(
  data: MachinesData,
  info: { id: string; os: Machine['os']; hostname: string; now: number }
): MachinesData {
  const existing = data.machines.find((m) => m.id === info.id)
  if (existing) {
    return {
      ...data,
      machines: data.machines.map((m) =>
        m.id === info.id
          ? { ...m, os: info.os, hostname: info.hostname, lastSeenAt: info.now }
          : m
      )
    }
  }
  const newMachine: Machine = {
    id: info.id,
    name: info.hostname,
    os: info.os,
    hostname: info.hostname,
    createdAt: info.now,
    lastSeenAt: info.now
  }
  return { ...data, machines: [...data.machines, newMachine] }
}
