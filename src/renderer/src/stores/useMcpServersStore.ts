import { create } from 'zustand'
import type { McpServer, McpServersData } from '@shared/types'
import { createPersistQueue, toErrorMessage } from './persist'

const persistQueue = createPersistQueue()

interface McpServersState {
  servers: McpServer[]
  loaded: boolean
  loading: boolean
  saveError: string | null

  loadData: (force?: boolean) => Promise<void>
  saveData: () => void

  addServer: (server: McpServer) => void
  addServerAfter: (afterId: string, server: McpServer) => void
  updateServer: (id: string, patch: Partial<McpServer>) => void
  removeServer: (id: string) => void
  reorderServers: (ids: string[]) => void

  clearSaveError: () => void
}

export const useMcpServersStore = create<McpServersState>((set, get) => ({
  servers: [],
  loaded: false,
  loading: false,
  saveError: null,

  async loadData(force = false) {
    if (get().loaded && !force) return
    set({ loading: true })
    try {
      const data: McpServersData = await window.electronAPI.loadMcpServersData()
      set({ servers: data.servers, loaded: true, loading: false })
    } catch {
      set({ servers: [], loaded: true, loading: false })
    }
  },

  saveData() {
    const { servers } = get()
    const data: McpServersData = { version: 1, servers }
    persistQueue.enqueue(() => window.electronAPI.saveMcpServersData(data)).catch((err) => {
      set({ saveError: toErrorMessage(err) })
    })
  },

  addServer(server) {
    set((s) => ({ servers: [...s.servers, server] }))
    get().saveData()
  },

  addServerAfter(afterId, server) {
    set((s) => {
      const idx = s.servers.findIndex((sv) => sv.id === afterId)
      if (idx === -1) return { servers: [...s.servers, server] }
      const next = [...s.servers]
      next.splice(idx + 1, 0, server)
      return { servers: next }
    })
    get().saveData()
  },

  updateServer(id, patch) {
    set((s) => ({
      servers: s.servers.map((sv) => (sv.id === id ? { ...sv, ...patch } : sv))
    }))
    get().saveData()
  },

  removeServer(id) {
    set((s) => ({ servers: s.servers.filter((sv) => sv.id !== id) }))
    get().saveData()
  },

  reorderServers(ids) {
    set((s) => {
      const map = new Map(s.servers.map((sv) => [sv.id, sv]))
      return { servers: ids.map((id) => map.get(id)!).filter(Boolean) }
    })
    get().saveData()
  },

  clearSaveError() {
    persistQueue.clearLastError()
    set({ saveError: null })
  }
}))
