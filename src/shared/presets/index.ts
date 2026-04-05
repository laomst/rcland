import type { PresetPack, PresetItem, AliasPreset, VariablePreset } from './types'
import { commonAliasPresets } from './aliases/common'
import { gitAliasPresets } from './aliases/git'
import { sdkVariablePresets } from './variables/sdk'

// Re-export types
export * from './types'

// Re-export preset collections
export { commonAliasPresets } from './aliases/common'
export { gitAliasPresets } from './aliases/git'
export { sdkVariablePresets } from './variables/sdk'

// ============================================================
// All alias presets combined
// ============================================================
export const allAliasPresets: AliasPreset[] = [
  ...commonAliasPresets,
  ...gitAliasPresets
]

// ============================================================
// All variable presets combined
// ============================================================
export const allVariablePresets: VariablePreset[] = [
  ...sdkVariablePresets
]

// ============================================================
// Built-in Preset Packs
// ============================================================

/** 常用别名包 */
export const commonAliasPack: PresetPack = {
  id: 'common-aliases',
  name: '常用别名',
  description: 'ls、导航、Python 等常用别名',
  version: '1.0.0',
  author: 'LMRC',
  category: 'alias',
  tags: ['alias', 'navigation'],
  items: commonAliasPresets
}

/** Git 别名包 */
export const gitAliasPack: PresetPack = {
  id: 'git-aliases',
  name: 'Git 别名',
  description: 'Git 常用别名',
  version: '1.0.0',
  author: 'LMRC',
  category: 'git',
  tags: ['git', 'alias'],
  items: gitAliasPresets
}

/** SDK 环境变量包 */
export const sdkPack: PresetPack = {
  id: 'sdk',
  name: 'SDK 环境变量',
  description: 'Java、Maven、Python 等 SDK 路径配置',
  version: '1.0.0',
  author: 'LMRC',
  category: 'sdk',
  tags: ['sdk', 'java', 'python', 'maven'],
  items: sdkVariablePresets
}

// ============================================================
// Registry
// ============================================================

/** All built-in preset packs */
export const builtInPresetPacks: PresetPack[] = [
  commonAliasPack,
  gitAliasPack,
  sdkPack
]

/**
 * Get all preset items flattened from all packs
 */
export function getAllPresetItems(): PresetItem[] {
  return [
    ...allAliasPresets,
    ...allVariablePresets
  ]
}

/**
 * Get preset items filtered by type
 */
export function getPresetsByType(type: 'alias'): AliasPreset[]
export function getPresetsByType(type: 'variable'): VariablePreset[]
export function getPresetsByType(type: 'alias' | 'variable'): PresetItem[]
export function getPresetsByType(type: 'alias' | 'variable'): PresetItem[] {
  switch (type) {
    case 'alias':
      return allAliasPresets
    case 'variable':
      return allVariablePresets
    default:
      return getAllPresetItems()
  }
}

/**
 * Get preset item by key
 */
export function getPresetByKey(key: string): PresetItem | undefined {
  return getAllPresetItems().find(item => item.key === key)
}

/**
 * Get all preset packs
 */
export function getAllPresetPacks(): PresetPack[] {
  return builtInPresetPacks
}

/**
 * Get preset pack by ID
 */
export function getPresetPackById(id: string): PresetPack | undefined {
  return builtInPresetPacks.find(pack => pack.id === id)
}

/**
 * Get preset categories for a given type
 */
export function getPresetCategories(type?: 'alias' | 'variable'): string[] {
  const items = type ? getPresetsByType(type) : getAllPresetItems()
  const categories = new Set(items.map(item => item.category))
  return Array.from(categories).sort()
}

/**
 * Search presets by query (searches name, description, tags, and category)
 */
export function searchPresets(query: string): PresetItem[] {
  const lowerQuery = query.toLowerCase()
  const results: PresetItem[] = []
  const seen = new Set<string>()

  for (const item of getAllPresetItems()) {
    if (seen.has(item.key)) continue
    seen.add(item.key)

    const nameMatch = item.name.toLowerCase().includes(lowerQuery)
    const descMatch = item.description?.toLowerCase().includes(lowerQuery) ?? false
    const tagMatch = item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ?? false
    const categoryMatch = item.category.toLowerCase().includes(lowerQuery)

    if (nameMatch || descMatch || tagMatch || categoryMatch) {
      results.push(item)
    }
  }

  return results
}

/**
 * Get all unique tags from presets
 */
export function getAllPresetTags(): string[] {
  const tags = new Set<string>()
  for (const pack of builtInPresetPacks) {
    pack.tags?.forEach(tag => tags.add(tag))
    for (const item of pack.items) {
      item.tags?.forEach(tag => tags.add(tag))
    }
  }
  return Array.from(tags).sort()
}
