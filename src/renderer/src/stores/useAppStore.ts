import { create } from 'zustand'
import type { Provider, ConfigSet, CCLaunchData, ProviderKey } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import { createTopLevelCrud } from './crud-helpers'

const DEFAULT_SELECTOR = { enabled: false, funcName: 'cc', promptTitle: '选择启动器' }

interface AppState {
  // Data
  providers: Provider[]
  configs: ConfigSet[]
  selector: CCLaunchData['selector']
  dataLoaded: boolean
  loading: boolean
  loadData: () => Promise<void>
  saveData: () => Promise<void>

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
}

export const useAppStore = create<AppState>((set, get) => {
  const providerCrud = createTopLevelCrud<Provider>('providers', get, set)
  const configCrud = createTopLevelCrud<ConfigSet>('configs', get, set)

  return {
  // ---- Data ----
  providers: [],
  configs: [],
  selector: DEFAULT_SELECTOR,
  dataLoaded: false,
  loading: false,

  loadData: async () => {
    if (get().loading || get().dataLoaded) return // 避免重复加载
    set({ loading: true })
    const json = await window.electronAPI.loadData()
    if (json) {
      const data: CCLaunchData = JSON.parse(json)
      set({ providers: data.providers, configs: data.configs, selector: data.selector ?? DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    } else {
      set({ providers: [], configs: [], selector: DEFAULT_SELECTOR, dataLoaded: true, loading: false })
    }
  },

  saveData: async () => {
    const { providers, configs, selector } = get()
    const data: CCLaunchData = { version: 5, providers, configs, selector }
    await window.electronAPI.saveData(JSON.stringify(data))
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
    get().saveData()
  },

  reorderProviders: providerCrud.reorder,

  // ---- Key CRUD ----
  addKey: (providerId, key) => {
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId ? { ...p, keys: [...p.keys, key] } : p
      )
    }))
    get().saveData()
  },

  updateKey: (providerId, keyId, patch) => {
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId
          ? { ...p, keys: p.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k)) }
          : p
      )
    }))
    get().saveData()
  },

  removeKey: (providerId, keyId) => {
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId
          ? { ...p, keys: p.keys.filter((k) => k.id !== keyId) }
          : p
      )
    }))
    get().saveData()
  },

  // ---- Config CRUD ----
  addConfig: configCrud.add,
  addConfigAfter: configCrud.addAfter,
  updateConfig: configCrud.update,
  removeConfig: configCrud.remove,
  reorderConfigs: configCrud.reorder
  }
})

/** Helper: create empty config with all env vars disabled */
export function createEmptyConfig(providerId: string, endpointId: string, keyId: string): ConfigSet {
  const envVars: ConfigSet['envVars'] = {}
  for (const key of CLAUDE_ENV_VAR_KEYS) {
    envVars[key] = { value: '', enabled: false }
  }
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
