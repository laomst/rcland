import { create } from 'zustand'
import {
  createEmptyCXLandData,
  type CXLandData,
  type CXProvider,
  type CXProviderKey,
  type CXEndpoint,
  type CXLaunchItem,
  type CXSelector
} from '@shared/types'
import { createTopLevelCrud } from './crud-helpers'
import { createPersistQueue, toErrorMessage } from './persist'

const persistQueue = createPersistQueue()

interface CXLandState {
  providers: CXProvider[]
  launchItems: CXLaunchItem[]
  selector: CXSelector
  dataLoaded: boolean
  loading: boolean
  saveError: string | null

  loadData: (force?: boolean) => Promise<void>
  saveData: () => Promise<void>
  clearSaveError: () => void

  // Provider CRUD
  addProvider: (provider: CXProvider) => void
  addProviderAfter: (afterId: string, provider: CXProvider) => void
  updateProvider: (id: string, patch: Partial<CXProvider>) => void
  removeProvider: (id: string) => void
  reorderProviders: (activeId: string, overId: string) => void

  // Endpoint CRUD (within provider)
  addEndpoint: (providerId: string, endpoint: CXEndpoint) => void
  updateEndpoint: (providerId: string, endpointId: string, patch: Partial<CXEndpoint>) => void
  removeEndpoint: (providerId: string, endpointId: string) => void

  // Key CRUD (within provider)
  addKey: (providerId: string, key: CXProviderKey) => void
  updateKey: (providerId: string, keyId: string, patch: Partial<CXProviderKey>) => void
  removeKey: (providerId: string, keyId: string) => void

  // Launch Item CRUD
  addLaunchItem: (item: CXLaunchItem) => void
  addLaunchItemAfter: (afterId: string, item: CXLaunchItem) => void
  updateLaunchItem: (itemId: string, patch: Partial<CXLaunchItem>) => void
  removeLaunchItem: (itemId: string) => void
  reorderLaunchItems: (activeId: string, overId: string) => void

  // Selector
  updateSelector: (patch: Partial<CXSelector>) => void
}

export const useCXLandStore = create<CXLandState>((set, get) => {
  const providerCrud = createTopLevelCrud<CXProvider>('providers', get, set)
  const launchItemCrud = createTopLevelCrud<CXLaunchItem>('launchItems', get, set)

  return {
    providers: [],
    launchItems: [],
    selector: createEmptyCXLandData().selector,
    dataLoaded: false,
    loading: false,
    saveError: null,

    loadData: async (force = false) => {
      if (get().loading || (!force && get().dataLoaded)) return
      set({ loading: true })
      const data = await window.electronAPI.loadCXLandData()
      const eff = data ?? createEmptyCXLandData()
      set({
        providers: eff.providers,
        launchItems: eff.launchItems,
        selector: eff.selector,
        dataLoaded: true,
        loading: false
      })
    },

    saveData: async () => {
      const { providers, launchItems, selector } = get()
      const data: CXLandData = { version: 3, providers, launchItems, selector }
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
    addProvider: providerCrud.add,
    addProviderAfter: providerCrud.addAfter,
    updateProvider: providerCrud.update,

    removeProvider: (id) => {
      set((s) => ({
        providers: s.providers.filter((p) => p.id !== id),
        launchItems: s.launchItems.filter((c) => c.providerId !== id)
      }))
      void get().saveData().catch(() => undefined)
    },

    reorderProviders: providerCrud.reorder,

    // ---- Endpoint CRUD ----
    addEndpoint: (providerId, endpoint) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, endpoints: [...p.endpoints, endpoint] } : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },
    updateEndpoint: (providerId, endpointId, patch) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId
            ? { ...p, endpoints: p.endpoints.map((e) => (e.id === endpointId ? { ...e, ...patch } : e)) }
            : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },
    removeEndpoint: (providerId, endpointId) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, endpoints: p.endpoints.filter((e) => e.id !== endpointId) } : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },

    // ---- Key CRUD ----
    addKey: (providerId, key) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, keys: [...p.keys, key] } : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },
    updateKey: (providerId, keyId, patch) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId
            ? { ...p, keys: p.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k)) }
            : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },
    removeKey: (providerId, keyId) => {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, keys: p.keys.filter((k) => k.id !== keyId) } : p
        )
      }))
      void get().saveData().catch(() => undefined)
    },

    // ---- Launch Item CRUD ----
    addLaunchItem: launchItemCrud.add,
    addLaunchItemAfter: launchItemCrud.addAfter,
    updateLaunchItem: launchItemCrud.update,
    removeLaunchItem: launchItemCrud.remove,
    reorderLaunchItems: launchItemCrud.reorder,

    // ---- Selector ----
    updateSelector: (patch) => {
      set((s) => ({ selector: { ...s.selector, ...patch } }))
      void get().saveData().catch(() => undefined)
    }
  }
})
