import { create } from 'zustand'
import type { Provider, ConfigSet, AppSettings, CCLaunchData, ProviderKey } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS, createEmptyKey } from '@shared/types'

const DEFAULT_SELECTOR = { enabled: false, funcName: 'cc', promptTitle: '选择启动器' }

interface AppState {
  // Data
  providers: Provider[]
  configs: ConfigSet[]
  selector: CCLaunchData['selector']
  dataLoaded: boolean
  loadData: () => Promise<void>
  saveData: () => Promise<void>

  // Settings
  settings: AppSettings | null
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>

  // Crypto
  keyExists: boolean
  keyModalOpen: boolean
  keyModalMode: 'init' | 'replace'
  refreshKeyExists: () => Promise<void>
  openKeyModal: (mode: 'init' | 'replace') => void
  closeKeyModal: () => void
  encryptToken: (plaintext: string) => Promise<string>

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

export const useAppStore = create<AppState>((set, get) => ({
  // ---- Data ----
  providers: [],
  configs: [],
  selector: DEFAULT_SELECTOR,
  dataLoaded: false,

  loadData: async () => {
    const json = await window.electronAPI.loadData()
    if (json) {
      const data: CCLaunchData = JSON.parse(json)
      set({ providers: data.providers, configs: data.configs, selector: data.selector ?? DEFAULT_SELECTOR, dataLoaded: true })
    } else {
      set({ providers: [], configs: [], selector: DEFAULT_SELECTOR, dataLoaded: true })
    }
  },

  saveData: async () => {
    const { providers, configs, selector } = get()
    const data: CCLaunchData = { version: 5, providers, configs, selector }
    await window.electronAPI.saveData(JSON.stringify(data))
  },

  // ---- Settings ----
  settings: null,

  loadSettings: async () => {
    const json = await window.electronAPI.loadSettings()
    if (json) {
      set({ settings: JSON.parse(json) })
    }
  },

  updateSettings: async (patch) => {
    const { settings } = get()
    if (!settings) return
    const updated = { ...settings, ...patch }
    await window.electronAPI.saveSettings(JSON.stringify(updated))
    set({ settings: updated })
  },

  // ---- Crypto ----
  keyExists: false,
  keyModalOpen: false,
  keyModalMode: 'init' as const,

  refreshKeyExists: async () => {
    try {
      const exists = await window.electronAPI.keyExists()
      set({ keyExists: exists })
    } catch { /* ignore */ }
  },

  openKeyModal: (mode) => {
    set({ keyModalOpen: true, keyModalMode: mode })
  },

  closeKeyModal: () => {
    set({ keyModalOpen: false })
  },

  encryptToken: async (plaintext) => {
    return window.electronAPI.encrypt(plaintext)
  },

  // ---- Provider CRUD ----
  addProvider: (provider) => {
    set((s) => ({ providers: [...s.providers, provider] }))
    get().saveData()
  },

  addProviderAfter: (afterId, provider) => {
    set((s) => {
      const idx = s.providers.findIndex((p) => p.id === afterId)
      const newProviders = [...s.providers]
      newProviders.splice(idx + 1, 0, provider)
      return { providers: newProviders }
    })
    get().saveData()
  },

  updateProvider: (id, patch) => {
    set((s) => ({
      providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p))
    }))
    get().saveData()
  },

  removeProvider: (id) => {
    set((s) => ({
      providers: s.providers.filter((p) => p.id !== id),
      configs: s.configs.filter((c) => c.providerId !== id)
    }))
    get().saveData()
  },

  reorderProviders: (activeId, overId) => {
    if (activeId === overId) return
    set((s) => {
      const oldIndex = s.providers.findIndex((p) => p.id === activeId)
      const newIndex = s.providers.findIndex((p) => p.id === overId)
      if (oldIndex === -1 || newIndex === -1) return s
      const newProviders = [...s.providers]
      const [removed] = newProviders.splice(oldIndex, 1)
      newProviders.splice(newIndex, 0, removed)
      return { providers: newProviders }
    })
    get().saveData()
  },

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
  addConfig: (config) => {
    set((s) => ({ configs: [...s.configs, config] }))
    get().saveData()
  },

  addConfigAfter: (afterId, config) => {
    set((s) => {
      const idx = s.configs.findIndex((c) => c.id === afterId)
      const next = [...s.configs]
      next.splice(idx + 1, 0, config)
      return { configs: next }
    })
    get().saveData()
  },

  updateConfig: (configId, patch) => {
    set((s) => ({
      configs: s.configs.map((c) => (c.id === configId ? { ...c, ...patch } : c))
    }))
    get().saveData()
  },

  removeConfig: (configId) => {
    set((s) => ({ configs: s.configs.filter((c) => c.id !== configId) }))
    get().saveData()
  },

  reorderConfigs: (activeId, overId) => {
    if (activeId === overId) return
    set((s) => {
      const oldIndex = s.configs.findIndex((c) => c.id === activeId)
      const newIndex = s.configs.findIndex((c) => c.id === overId)
      if (oldIndex === -1 || newIndex === -1) return s
      const newConfigs = [...s.configs]
      const [removed] = newConfigs.splice(oldIndex, 1)
      newConfigs.splice(newIndex, 0, removed)
      return { configs: newConfigs }
    })
    get().saveData()
  }
}))

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
