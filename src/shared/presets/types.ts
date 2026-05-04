import type { ShellType } from '../shell'
import type { ShellVariable, ShellFunction, ShellAlias } from '../shell-types'

// ============================================================
// Preset System Types
// ============================================================

/** Preset item types */
export type PresetItemType = 'alias' | 'variable'

/** Base preset item without ID (IDs are generated on import) */
export interface PresetItemBase {
  /** Unique identifier within the preset pack */
  key: string
  /** Display name for UI */
  name: string
  /** Detailed description */
  description?: string
  /** Category for grouping */
  category: string
  /** Tags for search/filter */
  tags?: string[]
}

/** Function preset - body without ID/enabled */
export interface FunctionPreset extends PresetItemBase {
  type: 'function'
  /** Function bodies per shell type */
  body: {
    zsh?: string
    bash?: string
    powershell?: string
  }
}

/** Alias preset - command without ID/enabled */
export interface AliasPreset extends PresetItemBase {
  type: 'alias'
  /** Alias name */
  alias: string
  /** Command to execute */
  command: string
  /** Shell types this alias applies to (all if undefined) */
  shells?: ShellType[]
}

/** Variable preset - key/value without ID/enabled */
export interface VariablePreset extends PresetItemBase {
  type: 'variable'
  /** Environment variable name */
  varKey: string
  /** Variable value */
  value: string
  /** Whether value should be encrypted */
  encrypted?: boolean
  /** Shell types this variable applies to (all if undefined) */
  shells?: ShellType[]
}

/** Union type for all preset items */
export type PresetItem = FunctionPreset | AliasPreset | VariablePreset

/** A collection of related presets */
export interface PresetPack {
  /** Unique pack identifier */
  id: string
  /** Display name */
  name: string
  /** Pack description */
  description?: string
  /** Pack version */
  version: string
  /** Author information */
  author?: string
  /** Pack category */
  category: string
  /** Tags for search */
  tags?: string[]
  /** Preset items in this pack */
  items: PresetItem[]
}

// ============================================================
// Conversion Helpers
// ============================================================

/** Convert a function preset to a ShellFunction (with new ID) */
export function functionPresetToShellFunction(preset: FunctionPreset): ShellFunction {
  return {
    id: crypto.randomUUID(),
    name: preset.name,
    category: preset.category,
    description: preset.description,
    body: { ...preset.body },
    enabled: true
  }
}

/** Convert an alias preset to a ShellAlias (with new ID) */
export function aliasPresetToShellAlias(preset: AliasPreset): ShellAlias {
  return {
    id: crypto.randomUUID(),
    alias: preset.alias,
    command: preset.command,
    description: preset.description,
    enabled: true,
    shells: preset.shells ? [...preset.shells] : undefined
  }
}

/** Convert a variable preset to a ShellVariable (with new ID) */
export function variablePresetToShellVariable(preset: VariablePreset): ShellVariable {
  return {
    id: crypto.randomUUID(),
    key: preset.varKey,
    value: preset.value,
    encrypted: preset.encrypted ?? false,
    description: preset.description,
    enabled: true,
    shells: preset.shells ? [...preset.shells] : undefined
  }
}

/** Type guard for function preset */
export function isFunctionPreset(item: PresetItem): item is FunctionPreset {
  return item.type === 'function'
}

/** Type guard for alias preset */
export function isAliasPreset(item: PresetItem): item is AliasPreset {
  return item.type === 'alias'
}

/** Type guard for variable preset */
export function isVariablePreset(item: PresetItem): item is VariablePreset {
  return item.type === 'variable'
}
