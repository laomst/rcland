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
import type { SystemProxyEnvVar } from '@shared/system-proxy'
import { mergeSystemProxyEnvVars } from '@shared/system-proxy'
import { createEmptyShellConfig, BUILTIN_FUNCTIONS } from '@shared/builtin-functions'
import { createShellConfigCrud } from './crud-helpers'
import { createPersistQueue, toErrorMessage } from './persist'

const persistQueue = createPersistQueue()

export interface ShellConfigState {
  shellConfig: ShellConfigData
  dataLoaded: boolean
  saveError: string | null

  // Load / Save
  loadShellConfig: (force?: boolean) => Promise<void>
  saveShellConfig: () => Promise<void>
  clearSaveError: () => void

  // Variables CRUD
  addVariable: (v: ShellVariable) => void
  addVariableAfter: (afterId: string, v: ShellVariable) => void
  updateVariable: (id: string, patch: Partial<ShellVariable>) => void
  removeVariable: (id: string) => void
  reorderVariables: (activeId: string, overId: string) => void

  // PATH CRUD
  addPathEntry: (e: PathEntry) => void
  addPathEntryAfter: (afterId: string, e: PathEntry) => void
  updatePathEntry: (id: string, patch: Partial<PathEntry>) => void
  removePathEntry: (id: string) => void
  reorderPathEntries: (activeId: string, overId: string) => void

  // Functions CRUD
  addFunction: (fn: ShellFunction) => void
  addFunctionAfter: (afterId: string, fn: ShellFunction) => void
  updateFunction: (id: string, patch: Partial<ShellFunction>) => void
  removeFunction: (id: string) => void
  reorderFunctions: (activeId: string, overId: string) => void

  // Aliases CRUD
  addAlias: (a: ShellAlias) => void
  addAliasAfter: (afterId: string, a: ShellAlias) => void
  updateAlias: (id: string, patch: Partial<ShellAlias>) => void
  removeAlias: (id: string) => void
  reorderAliases: (activeId: string, overId: string) => void

  // Prompt
  updatePrompt: (config: PromptConfig) => void

  // Output
  updateOutput: (config: OutputConfig) => void

  // System proxy
  updateSystemProxyEnvVar: (index: number, value: string) => void
  importSystemProxyEnvVars: (items: SystemProxyEnvVar[]) => void

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
    saveError: null,

    loadShellConfig: async (_force = false) => {
      const data = await window.electronAPI.loadShellConfig()
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
      await persistQueue.enqueue(async () => {
        await window.electronAPI.saveShellConfig(shellConfig)
      }).then(() => {
        set({ saveError: null })
      }).catch((err) => {
        set({ saveError: toErrorMessage(err) })
        throw err
      })
    },

    clearSaveError: () => {
      persistQueue.clearLastError()
      set({ saveError: null })
    },

    // Variables
    addVariable: variablesCrud.add,
    addVariableAfter: variablesCrud.addAfter,
    updateVariable: variablesCrud.update,
    removeVariable: variablesCrud.remove,
    reorderVariables: variablesCrud.reorder,

    // PATH
    addPathEntry: pathEntriesCrud.add,
    addPathEntryAfter: pathEntriesCrud.addAfter,
    updatePathEntry: pathEntriesCrud.update,
    removePathEntry: pathEntriesCrud.remove,
    reorderPathEntries: pathEntriesCrud.reorder,

    // Functions — add and reorder from factory; update and remove are custom
    addFunction: functionsCrud.add,
    addFunctionAfter: functionsCrud.addAfter,

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
      void get().saveShellConfig().catch(() => undefined)
    },

    removeFunction: (id) => {
      const fn = get().shellConfig.functions.find((f) => f.id === id)
      if (fn?.builtIn) return
      set((s) => ({
        shellConfig: { ...s.shellConfig, functions: s.shellConfig.functions.filter((f) => f.id !== id) }
      }))
      void get().saveShellConfig().catch(() => undefined)
    },

    reorderFunctions: functionsCrud.reorder,

    // Aliases
    addAlias: aliasesCrud.add,
    addAliasAfter: aliasesCrud.addAfter,
    updateAlias: aliasesCrud.update,
    removeAlias: aliasesCrud.remove,
    reorderAliases: aliasesCrud.reorder,

    // Prompt
    updatePrompt: (config) => {
      set((s) => ({ shellConfig: { ...s.shellConfig, prompt: config } }))
      void get().saveShellConfig().catch(() => undefined)
    },

    // Output
    updateOutput: (config) => {
      set((s) => ({ shellConfig: { ...s.shellConfig, output: config } }))
      void get().saveShellConfig().catch(() => undefined)
    },

    updateSystemProxyEnvVar: (index, value) => {
      set((s) => ({
        shellConfig: {
          ...s.shellConfig,
          systemProxy: {
            ...s.shellConfig.systemProxy,
            proxyEnvVars: s.shellConfig.systemProxy.proxyEnvVars.map((item, itemIndex) =>
              itemIndex === index ? { ...item, value } : item
            )
          }
        }
      }))
      void get().saveShellConfig().catch(() => undefined)
    },

    importSystemProxyEnvVars: (items) => {
      set((s) => ({
        shellConfig: {
          ...s.shellConfig,
          systemProxy: {
            proxyEnvVars: mergeSystemProxyEnvVars(s.shellConfig.systemProxy.proxyEnvVars, items)
          }
        }
      }))
      void get().saveShellConfig().catch(() => undefined)
    },

    // Conflict check
    checkConflicts: async () => {
      const { shellConfig } = get()
      return window.electronAPI.checkConflicts(shellConfig)
    }
  }
})
