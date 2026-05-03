import { create } from 'zustand'
import type { Provider, LaunchItem, CCLaunchData, ProviderKey } from '@shared/types'
import { createTopLevelCrud } from './crud-helpers'
import { createPersistQueue, toErrorMessage } from './persist'

const DEFAULT_SELECTOR = { funcName: 'cc', promptTitle: '选择启动器', kanban: { funcName: 'show-cc-usage', enabled: false } }
const persistQueue = createPersistQueue()

interface AppState {
  // Data
  providers: Provider[]
  launchItems: LaunchItem[]
  selector: CCLaunchData['selector']
  dataLoaded: boolean
  loading: boolean
  saveError: string | null
  loadData: (force?: boolean) => Promise<void>
  saveData: () => Promise<void>
  clearSaveError: () => void

  // Provider CRUD
  addProvider: (provider: Provider) => void
  addProviderAfter: (afterId: string, provider: Provider) => void
  updateProvider: (id: string, patch: Partial<Provider>) => void
  removeProvider: (id: string) => void
  reorderProviders: (activeId: string, overId: string) => void

  // Key CRUD (within provider)
  addKey: (providerId: string, key: ProviderKey) => void
  updateKey: (providerId: string, keyId: string, patch: Partial<ProviderKey>) => void
  removeKey: (providerId: string, keyId: string) => void

  // Launch Item CRUD
  addLaunchItem: (item: LaunchItem) => void
  addLaunchItemAfter: (afterId: string, item: LaunchItem) => void
  updateLaunchItem: (itemId: string, patch: Partial<LaunchItem>) => void
  removeLaunchItem: (itemId: string) => void
  reorderLaunchItems: (activeId: string, overId: string) => void

  // Selector
  updateSelector: (patch: Partial<CCLaunchData['selector']>) => void
}

export const useCCLaunchStore = create<AppState>((set, get) => {
  const providerCrud = createTopLevelCrud<Provider>('providers', get, set)
  const launchItemCrud = createTopLevelCrud<LaunchItem>('launchItems', get, set)

  return {
  // ---- Data ----
  providers: [],
  launchItems: [],
  selector: DEFAULT_SELECTOR,
  dataLoaded: false,
  loading: false,
  saveError: null,

  loadData: async (force = false) => {
    if (get().loading || (!force && get().dataLoaded)) return
    set({ loading: true })
    const data = await window.electronAPI.loadData()
    if (data) {
      set({ providers: data.providers, launchItems: data.launchItems, selector: data.selector ?? DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    } else {
      set({ providers: [], launchItems: [], selector: DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    }
  },

  saveData: async () => {
    const { providers, launchItems, selector } = get()
    const data: CCLaunchData = { version: 5, providers, launchItems, selector }
    await persistQueue.enqueue(async () => {
      await window.electronAPI.saveData(data)
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
        p.id === providerId
          ? { ...p, keys: p.keys.filter((k) => k.id !== keyId) }
          : p
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

export function createEmptyLaunchItem(providerId: string, endpointId: string, keyId: string): LaunchItem {
  const envVars: LaunchItem['envVars'] = {}
  return {
    id: crypto.randomUUID(),
    providerId,
    endpointId,
    keyId,
    name: '',
    funcName: '',
    enabled: true,
    envVars
  }
}
