import { create } from 'zustand'
import type { Provider, ConfigSet, CCLaunchData, ProviderKey } from '@shared/types'
import { createTopLevelCrud } from './crud-helpers'
import { createPersistQueue, toErrorMessage } from './persist'

const DEFAULT_SELECTOR = { funcName: 'cc', promptTitle: '选择启动器' }
const persistQueue = createPersistQueue()

interface AppState {
  // Data
  providers: Provider[]
  configs: ConfigSet[]
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

  // Config CRUD
  addConfig: (config: ConfigSet) => void
  addConfigAfter: (afterId: string, config: ConfigSet) => void
  updateConfig: (configId: string, patch: Partial<ConfigSet>) => void
  removeConfig: (configId: string) => void
  reorderConfigs: (activeId: string, overId: string) => void

  // Selector
  updateSelector: (patch: Partial<CCLaunchData['selector']>) => void
}

export const useCCLaunchStore = create<AppState>((set, get) => {
  const providerCrud = createTopLevelCrud<Provider>('providers', get, set)
  const configCrud = createTopLevelCrud<ConfigSet>('configs', get, set)

  return {
  // ---- Data ----
  providers: [],
  configs: [],
  selector: DEFAULT_SELECTOR,
  dataLoaded: false,
  loading: false,
  saveError: null,

  loadData: async (force = false) => {
    if (get().loading || (!force && get().dataLoaded)) return // 避免重复加载
    set({ loading: true })
    const data = await window.electronAPI.loadData()
    if (data) {
      set({ providers: data.providers, configs: data.configs, selector: data.selector ?? DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    } else {
      set({ providers: [], configs: [], selector: DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    }
  },

  saveData: async () => {
    const { providers, configs, selector } = get()
    const data: CCLaunchData = { version: 5, providers, configs, selector }
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
      configs: s.configs.filter((c) => c.providerId !== id)
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

  // ---- Config CRUD ----
  addConfig: configCrud.add,
  addConfigAfter: configCrud.addAfter,
  updateConfig: configCrud.update,
  removeConfig: configCrud.remove,
  reorderConfigs: configCrud.reorder,

  // ---- Selector ----
  updateSelector: (patch) => {
    set((s) => ({ selector: { ...s.selector, ...patch } }))
    void get().saveData().catch(() => undefined)
  }
  }
})

/** Helper: create empty config with all env vars disabled */
export function createEmptyConfig(providerId: string, endpointId: string, keyId: string): ConfigSet {
  const envVars: ConfigSet['envVars'] = {}
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
