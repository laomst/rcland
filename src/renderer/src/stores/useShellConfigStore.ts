import { create } from 'zustand'
import type {
  ShellConfigData,
  ShellVariable,
  PathEntry,
  ShellFunction,
  ShellAlias,
  PromptConfig,
  OutputConfig,
  ConflictCheckResult
} from '@shared/shell-types'
import { createEmptyShellConfig } from '@shared/shell-types'

/** Helper to reorder an array by moving an item from one position to another */
function reorder<T extends { id: string }>(arr: T[], activeId: string, overId: string): T[] {
  const oldIndex = arr.findIndex((x) => x.id === activeId)
  const newIndex = arr.findIndex((x) => x.id === overId)
  if (oldIndex === -1 || newIndex === -1) return arr
  const result = [...arr]
  const [removed] = result.splice(oldIndex, 1)
  result.splice(newIndex, 0, removed)
  return result
}

export interface ShellConfigState {
  shellConfig: ShellConfigData
  dataLoaded: boolean

  // Load / Save
  loadShellConfig: () => Promise<void>
  saveShellConfig: () => Promise<void>

  // Variables CRUD
  addVariable: (v: ShellVariable) => void
  updateVariable: (id: string, patch: Partial<ShellVariable>) => void
  removeVariable: (id: string) => void
  reorderVariables: (activeId: string, overId: string) => void

  // PATH CRUD
  addPathEntry: (e: PathEntry) => void
  updatePathEntry: (id: string, patch: Partial<PathEntry>) => void
  removePathEntry: (id: string) => void
  reorderPathEntries: (activeId: string, overId: string) => void

  // Functions CRUD
  addFunction: (fn: ShellFunction) => void
  updateFunction: (id: string, patch: Partial<ShellFunction>) => void
  removeFunction: (id: string) => void
  reorderFunctions: (activeId: string, overId: string) => void

  // Aliases CRUD
  addAlias: (a: ShellAlias) => void
  updateAlias: (id: string, patch: Partial<ShellAlias>) => void
  removeAlias: (id: string) => void
  reorderAliases: (activeId: string, overId: string) => void

  // Prompt
  updatePrompt: (config: PromptConfig) => void

  // Output
  updateOutput: (config: OutputConfig) => void

  // Conflict check
  checkConflicts: () => Promise<ConflictCheckResult>
}

export const useShellConfigStore = create<ShellConfigState>((set, get) => ({
  shellConfig: createEmptyShellConfig(),
  dataLoaded: false,

  loadShellConfig: async () => {
    const json = await window.electronAPI.loadShellConfig()
    const data: ShellConfigData = JSON.parse(json)
    set({ shellConfig: data, dataLoaded: true })
  },

  saveShellConfig: async () => {
    const { shellConfig } = get()
    await window.electronAPI.saveShellConfig(JSON.stringify(shellConfig))
  },

  // Variables
  addVariable: (v) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, variables: [...s.shellConfig.variables, v] } }))
    get().saveShellConfig()
  },

  updateVariable: (id, patch) => {
    set((s) => ({
      shellConfig: {
        ...s.shellConfig,
        variables: s.shellConfig.variables.map((v) => (v.id === id ? { ...v, ...patch } : v))
      }
    }))
    get().saveShellConfig()
  },

  removeVariable: (id) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, variables: s.shellConfig.variables.filter((v) => v.id !== id) }
    }))
    get().saveShellConfig()
  },

  reorderVariables: (activeId, overId) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, variables: reorder(s.shellConfig.variables, activeId, overId) }
    }))
    get().saveShellConfig()
  },

  // PATH
  addPathEntry: (e) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, pathEntries: [...s.shellConfig.pathEntries, e] } }))
    get().saveShellConfig()
  },

  updatePathEntry: (id, patch) => {
    set((s) => ({
      shellConfig: {
        ...s.shellConfig,
        pathEntries: s.shellConfig.pathEntries.map((p) => (p.id === id ? { ...p, ...patch } : p))
      }
    }))
    get().saveShellConfig()
  },

  removePathEntry: (id) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, pathEntries: s.shellConfig.pathEntries.filter((p) => p.id !== id) }
    }))
    get().saveShellConfig()
  },

  reorderPathEntries: (activeId, overId) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, pathEntries: reorder(s.shellConfig.pathEntries, activeId, overId) }
    }))
    get().saveShellConfig()
  },

  // Functions
  addFunction: (fn) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, functions: [...s.shellConfig.functions, fn] } }))
    get().saveShellConfig()
  },

  updateFunction: (id, patch) => {
    set((s) => ({
      shellConfig: {
        ...s.shellConfig,
        functions: s.shellConfig.functions.map((f) => (f.id === id ? { ...f, ...patch } : f))
      }
    }))
    get().saveShellConfig()
  },

  removeFunction: (id) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, functions: s.shellConfig.functions.filter((f) => f.id !== id) }
    }))
    get().saveShellConfig()
  },

  reorderFunctions: (activeId, overId) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, functions: reorder(s.shellConfig.functions, activeId, overId) }
    }))
    get().saveShellConfig()
  },

  // Aliases
  addAlias: (a) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, aliases: [...s.shellConfig.aliases, a] } }))
    get().saveShellConfig()
  },

  updateAlias: (id, patch) => {
    set((s) => ({
      shellConfig: {
        ...s.shellConfig,
        aliases: s.shellConfig.aliases.map((a) => (a.id === id ? { ...a, ...patch } : a))
      }
    }))
    get().saveShellConfig()
  },

  removeAlias: (id) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, aliases: s.shellConfig.aliases.filter((a) => a.id !== id) }
    }))
    get().saveShellConfig()
  },

  reorderAliases: (activeId, overId) => {
    set((s) => ({
      shellConfig: { ...s.shellConfig, aliases: reorder(s.shellConfig.aliases, activeId, overId) }
    }))
    get().saveShellConfig()
  },

  // Prompt
  updatePrompt: (config) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, prompt: config } }))
    get().saveShellConfig()
  },

  // Output
  updateOutput: (config) => {
    set((s) => ({ shellConfig: { ...s.shellConfig, output: config } }))
    get().saveShellConfig()
  },

  // Conflict check
  checkConflicts: async () => {
    const { shellConfig } = get()
    return window.electronAPI.checkConflicts(JSON.stringify(shellConfig))
  }
}))
