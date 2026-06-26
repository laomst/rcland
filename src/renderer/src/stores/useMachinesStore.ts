import { create } from 'zustand'
import type { Machine } from '@shared/types'

interface MachinesState {
  machines: Machine[]
  currentMachineId: string | null
  loaded: boolean
  loadMachines: () => Promise<void>
  renameMachine: (id: string, name: string) => Promise<void>
  deleteMachine: (id: string) => Promise<void>
}

export const useMachinesStore = create<MachinesState>((set, get) => ({
  machines: [],
  currentMachineId: null,
  loaded: false,

  loadMachines: async () => {
    const status = await window.electronAPI.machineStatus()
    set({ machines: status.machines, currentMachineId: status.machineId, loaded: true })
  },

  renameMachine: async (id, name) => {
    const target = get().machines.find((m) => m.id === id)
    if (!target) return
    const machines = await window.electronAPI.machineUpdate({ ...target, name })
    set({ machines })
  },

  deleteMachine: async (id) => {
    const machines = await window.electronAPI.machineDelete(id)
    set({ machines })
  }
}))
