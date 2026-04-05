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
import { createEmptyShellConfig, BUILTIN_FUNCTIONS } from '@shared/builtin-functions'
import { createShellConfigCrud } from './crud-helpers'

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

export const useShellConfigStore = create<ShellConfigState>((set, get) => {
  const variablesCrud = createShellConfigCrud<ShellVariable>('variables', get, set)
  const pathEntriesCrud = createShellConfigCrud<PathEntry>('pathEntries', get, set)
  const functionsCrud = createShellConfigCrud<ShellFunction>('functions', get, set)
  const aliasesCrud = createShellConfigCrud<ShellAlias>('aliases', get, set)

  return {
    shellConfig: createEmptyShellConfig(),
    dataLoaded: false,

    loadShellConfig: async () => {
      const json = await window.electronAPI.loadShellConfig()
      const data: ShellConfigData = JSON.parse(json)
      // 合并内置函数：保留用户的 enabled 状态，其余用内置定义覆盖
      const userFunctions = data.functions.filter((f) => !f.builtIn)
      const mergedBuiltIns = BUILTIN_FUNCTIONS.map((bi) => {
        const existing = data.functions.find((f) => f.id === bi.id)
        return { ...bi, enabled: existing ? existing.enabled : bi.enabled }
      })
      data.functions = [...mergedBuiltIns, ...userFunctions]
      set({ shellConfig: data, dataLoaded: true })
    },

    saveShellConfig: async () => {
      const { shellConfig } = get()
      // 内置函数只保存 id 和 enabled，body 等字段从代码定义加载
      const dataToSave = {
        ...shellConfig,
        functions: shellConfig.functions.map((f) =>
          f.builtIn ? { id: f.id, enabled: f.enabled, builtIn: true } : f
        )
      }
      await window.electronAPI.saveShellConfig(JSON.stringify(dataToSave))
    },

    // Variables
    addVariable: variablesCrud.add,
    updateVariable: variablesCrud.update,
    removeVariable: variablesCrud.remove,
    reorderVariables: variablesCrud.reorder,

    // PATH
    addPathEntry: pathEntriesCrud.add,
    updatePathEntry: pathEntriesCrud.update,
    removePathEntry: pathEntriesCrud.remove,
    reorderPathEntries: pathEntriesCrud.reorder,

    // Functions — add and reorder from factory; update and remove are custom
    addFunction: functionsCrud.add,

    updateFunction: (id, patch) => {
      set((s) => ({
        shellConfig: {
          ...s.shellConfig,
          functions: s.shellConfig.functions.map((f) => {
            if (f.id !== id) return f
            // 内置函数忽略 enabled 字段的修改
            if (f.builtIn && 'enabled' in patch) {
              const { enabled: _, ...rest } = patch
              return { ...f, ...rest }
            }
            return { ...f, ...patch }
          })
        }
      }))
      get().saveShellConfig()
    },

    removeFunction: (id) => {
      const fn = get().shellConfig.functions.find((f) => f.id === id)
      if (fn?.builtIn) return
      set((s) => ({
        shellConfig: { ...s.shellConfig, functions: s.shellConfig.functions.filter((f) => f.id !== id) }
      }))
      get().saveShellConfig()
    },

    reorderFunctions: functionsCrud.reorder,

    // Aliases
    addAlias: aliasesCrud.add,
    updateAlias: aliasesCrud.update,
    removeAlias: aliasesCrud.remove,
    reorderAliases: aliasesCrud.reorder,

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
  }
})
