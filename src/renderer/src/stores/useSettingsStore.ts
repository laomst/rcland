import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

interface SettingsState {
  settings: AppSettings | null
  keyExists: boolean
  keyModalOpen: boolean
  keyModalMode: 'init' | 'replace'
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  refreshKeyExists: () => Promise<void>
  openKeyModal: (mode: 'init' | 'replace') => void
  closeKeyModal: () => void
  encryptToken: (plaintext: string) => Promise<string>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
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
  }
}))
