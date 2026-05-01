import { create } from 'zustand'
import {
  createEmptyCXLandData,
  type CXLandData,
  type CXProvider,
  type CXProviderKey,
  type CXEndpoint,
  type CXConfigSet,
  type CXSelector
} from '@shared/types'
import { createPersistQueue, toErrorMessage } from './persist'

const persistQueue = createPersistQueue()

interface CXLandState {
  data: CXLandData
  dataLoaded: boolean
  loading: boolean
  saveError: string | null

  loadData: (force?: boolean) => Promise<void>
  saveData: () => Promise<void>
  clearSaveError: () => void

  // Provider CRUD
  addCXProvider: (provider: CXProvider) => void
  updateCXProvider: (id: string, patch: Partial<CXProvider>) => void
  removeCXProvider: (id: string) => void
  reorderCXProviders: (activeId: string, overId: string) => void

  // Endpoint CRUD (within provider)
  addCXEndpoint: (providerId: string, endpoint: CXEndpoint) => void
  updateCXEndpoint: (providerId: string, endpointId: string, patch: Partial<CXEndpoint>) => void
  removeCXEndpoint: (providerId: string, endpointId: string) => void

  // Key CRUD (within provider)
  addCXKey: (providerId: string, key: CXProviderKey) => void
  updateCXKey: (providerId: string, keyId: string, patch: Partial<CXProviderKey>) => void
  removeCXKey: (providerId: string, keyId: string) => void

  // Config CRUD
  addCXConfig: (config: CXConfigSet) => void
  updateCXConfig: (configId: string, patch: Partial<CXConfigSet>) => void
  removeCXConfig: (configId: string) => void
  reorderCXConfigs: (activeId: string, overId: string) => void

  // Selector
  updateCXSelector: (patch: Partial<CXSelector>) => void
}

function persist(get: () => CXLandState, set: (fn: (s: CXLandState) => Partial<CXLandState>) => void) {
  void persistQueue.enqueue(async () => {
    await window.electronAPI.saveCXLandData(get().data)
  }).then(() => {
    set(() => ({ saveError: null }))
  }).catch((err) => {
    set(() => ({ saveError: toErrorMessage(err) }))
  })
}

export const useCXLandStore = create<CXLandState>((set, get) => ({
  data: createEmptyCXLandData(),
  dataLoaded: false,
  loading: false,
  saveError: null,

  loadData: async (force = false) => {
    if (get().loading || (!force && get().dataLoaded)) return
    set({ loading: true })
    const data = await window.electronAPI.loadCXLandData()
    set({ data: data ?? createEmptyCXLandData(), dataLoaded: true, loading: false })
  },

  saveData: async () => {
    const { data } = get()
    await persistQueue.enqueue(async () => {
      await window.electronAPI.saveCXLandData(data)
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

  // ---- Provider CRUD ----
  addCXProvider: (provider) => {
    set((s) => ({ data: { ...s.data, providers: [...s.data.providers, provider] } }))
    persist(get, set)
  },
  updateCXProvider: (id, patch) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) => (p.id === id ? { ...p, ...patch } : p))
      }
    }))
    persist(get, set)
  },
  removeCXProvider: (id) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.filter((p) => p.id !== id),
        configs: s.data.configs.filter((c) => c.providerId !== id)  // cascade
      }
    }))
    persist(get, set)
  },
  reorderCXProviders: (activeId, overId) => {
    if (activeId === overId) return
    set((s) => {
      const arr = [...s.data.providers]
      const oldIdx = arr.findIndex((p) => p.id === activeId)
      const newIdx = arr.findIndex((p) => p.id === overId)
      if (oldIdx === -1 || newIdx === -1) return s
      const [moved] = arr.splice(oldIdx, 1)
      arr.splice(newIdx, 0, moved)
      return { data: { ...s.data, providers: arr } }
    })
    persist(get, set)
  },

  // ---- Endpoint CRUD ----
  addCXEndpoint: (providerId, endpoint) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId ? { ...p, endpoints: [...p.endpoints, endpoint] } : p
        )
      }
    }))
    persist(get, set)
  },
  updateCXEndpoint: (providerId, endpointId, patch) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId
            ? { ...p, endpoints: p.endpoints.map((e) => (e.id === endpointId ? { ...e, ...patch } : e)) }
            : p
        )
      }
    }))
    persist(get, set)
  },
  removeCXEndpoint: (providerId, endpointId) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId ? { ...p, endpoints: p.endpoints.filter((e) => e.id !== endpointId) } : p
        )
      }
    }))
    persist(get, set)
  },

  // ---- Key CRUD ----
  addCXKey: (providerId, key) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId ? { ...p, keys: [...p.keys, key] } : p
        )
      }
    }))
    persist(get, set)
  },
  updateCXKey: (providerId, keyId, patch) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId
            ? { ...p, keys: p.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k)) }
            : p
        )
      }
    }))
    persist(get, set)
  },
  removeCXKey: (providerId, keyId) => {
    set((s) => ({
      data: {
        ...s.data,
        providers: s.data.providers.map((p) =>
          p.id === providerId ? { ...p, keys: p.keys.filter((k) => k.id !== keyId) } : p
        )
      }
    }))
    persist(get, set)
  },

  // ---- Config CRUD ----
  addCXConfig: (config) => {
    set((s) => ({ data: { ...s.data, configs: [...s.data.configs, config] } }))
    persist(get, set)
  },
  updateCXConfig: (configId, patch) => {
    set((s) => ({
      data: {
        ...s.data,
        configs: s.data.configs.map((c) => (c.id === configId ? { ...c, ...patch } : c))
      }
    }))
    persist(get, set)
  },
  removeCXConfig: (configId) => {
    set((s) => ({
      data: { ...s.data, configs: s.data.configs.filter((c) => c.id !== configId) }
    }))
    persist(get, set)
  },
  reorderCXConfigs: (activeId, overId) => {
    if (activeId === overId) return
    set((s) => {
      const arr = [...s.data.configs]
      const oldIdx = arr.findIndex((c) => c.id === activeId)
      const newIdx = arr.findIndex((c) => c.id === overId)
      if (oldIdx === -1 || newIdx === -1) return s
      const [moved] = arr.splice(oldIdx, 1)
      arr.splice(newIdx, 0, moved)
      return { data: { ...s.data, configs: arr } }
    })
    persist(get, set)
  },

  // ---- Selector ----
  updateCXSelector: (patch) => {
    set((s) => ({ data: { ...s.data, selector: { ...s.data.selector, ...patch } } }))
    persist(get, set)
  }
}))
