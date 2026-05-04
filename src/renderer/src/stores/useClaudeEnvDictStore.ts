import { create } from 'zustand'
import type {
  ClaudeEnvDictItem,
  UserClaudeEnvDictItem,
  BuiltInOverride
} from '@shared/types/claude-env-dict'

interface ClaudeEnvDictState {
  items: ClaudeEnvDictItem[]
  loaded: boolean
  loading: boolean

  load: (force?: boolean) => Promise<void>
  addUserItem: (item: UserClaudeEnvDictItem) => Promise<void>
  updateUserItem: (item: UserClaudeEnvDictItem) => Promise<void>
  deleteUserItem: (key: string) => Promise<void>
  setBuiltInOverride: (key: string, override: BuiltInOverride) => Promise<void>

  /** 同步查询：通过 key 取条目 */
  getItem: (key: string) => ClaudeEnvDictItem | undefined
  /** 同步查询：取所有 defaultInTemplate=true 的 key 列表 */
  getDefaultTemplateKeys: () => string[]
}

export const useClaudeEnvDictStore = create<ClaudeEnvDictState>((set, get) => ({
  items: [],
  loaded: false,
  loading: false,

  load: async (force = false) => {
    if (get().loading || (!force && get().loaded)) return
    set({ loading: true })
    try {
      const items = await window.electronAPI.loadClaudeEnvDict()
      set({ items, loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  addUserItem: async (item) => {
    const items = await window.electronAPI.addClaudeEnvDictUserItem(item)
    set({ items })
  },

  updateUserItem: async (item) => {
    const items = await window.electronAPI.updateClaudeEnvDictUserItem(item)
    set({ items })
  },

  deleteUserItem: async (key) => {
    const items = await window.electronAPI.deleteClaudeEnvDictUserItem(key)
    set({ items })
  },

  setBuiltInOverride: async (key, override) => {
    const items = await window.electronAPI.setClaudeEnvDictBuiltInOverride(key, override)
    set({ items })
  },

  getItem: (key) => get().items.find((i) => i.key === key),
  getDefaultTemplateKeys: () => get().items.filter((i) => i.defaultInTemplate).map((i) => i.key),
}))
