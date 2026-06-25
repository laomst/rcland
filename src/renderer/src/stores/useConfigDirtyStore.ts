import { create } from 'zustand'

interface ConfigDirtyState {
  version: number
  appliedVersion: number
  isDirty: () => boolean
  bump: () => void
  markApplied: () => void
}

export const useConfigDirtyStore = create<ConfigDirtyState>((set, get) => ({
  version: 0,
  appliedVersion: 0,
  isDirty: () => get().version !== get().appliedVersion,
  bump: () => set((s) => ({ version: s.version + 1 })),
  markApplied: () => set((s) => ({ appliedVersion: s.version })),
}))
