/**
 * Creates standard CRUD actions for a nested array field in shellConfig.
 * Used by useShellConfigStore for variables, pathEntries, functions, aliases.
 */
export function createShellConfigCrud<T extends { id: string }>(
  field: string,
  get: () => any,
  set: (fn: (state: any) => any) => void
) {
  const reorder = (arr: T[], activeId: string, overId: string): T[] => {
    const oldIndex = arr.findIndex((x) => x.id === activeId)
    const newIndex = arr.findIndex((x) => x.id === overId)
    if (oldIndex === -1 || newIndex === -1) return arr
    const result = [...arr]
    const [removed] = result.splice(oldIndex, 1)
    result.splice(newIndex, 0, removed)
    return result
  }

  return {
    add: (item: T) => {
      set((s: any) => ({
        shellConfig: { ...s.shellConfig, [field]: [...s.shellConfig[field], item] }
      }))
      get().saveShellConfig()
    },
    update: (id: string, patch: Partial<T>) => {
      set((s: any) => ({
        shellConfig: {
          ...s.shellConfig,
          [field]: s.shellConfig[field].map((x: T) => (x.id === id ? { ...x, ...patch } : x))
        }
      }))
      get().saveShellConfig()
    },
    remove: (id: string) => {
      set((s: any) => ({
        shellConfig: { ...s.shellConfig, [field]: s.shellConfig[field].filter((x: T) => x.id !== id) }
      }))
      get().saveShellConfig()
    },
    reorder: (activeId: string, overId: string) => {
      set((s: any) => ({
        shellConfig: { ...s.shellConfig, [field]: reorder(s.shellConfig[field], activeId, overId) }
      }))
      get().saveShellConfig()
    }
  }
}

/**
 * Creates standard CRUD actions for a top-level array field.
 * Used by useAppStore for providers, configs.
 */
export function createTopLevelCrud<T extends { id: string }>(
  field: string,
  get: () => any,
  set: (fn: (state: any) => any) => void
) {
  return {
    add: (item: T) => {
      set((s: any) => ({ [field]: [...s[field], item] }))
      get().saveData()
    },
    addAfter: (afterId: string, item: T) => {
      set((s: any) => {
        const arr = [...s[field]]
        const idx = arr.findIndex((x: T) => x.id === afterId)
        arr.splice(idx + 1, 0, item)
        return { [field]: arr }
      })
      get().saveData()
    },
    update: (id: string, patch: Partial<T>) => {
      set((s: any) => ({
        [field]: s[field].map((x: T) => (x.id === id ? { ...x, ...patch } : x))
      }))
      get().saveData()
    },
    remove: (id: string) => {
      set((s: any) => ({ [field]: s[field].filter((x: T) => x.id !== id) }))
      get().saveData()
    },
    reorder: (activeId: string, overId: string) => {
      if (activeId === overId) return
      set((s: any) => {
        const arr = [...s[field]]
        const oldIdx = arr.findIndex((x: T) => x.id === activeId)
        const newIdx = arr.findIndex((x: T) => x.id === overId)
        if (oldIdx === -1 || newIdx === -1) return s
        const [removed] = arr.splice(oldIdx, 1)
        arr.splice(newIdx, 0, removed)
        return { [field]: arr }
      })
      get().saveData()
    }
  }
}
