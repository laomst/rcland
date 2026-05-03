import type { AppSettings, CCLaunchData, CXLandData } from './types'
import type { ShellConfigData } from './shell-types'

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function assertArray(value: unknown, field: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`)
  }
}

export function assertCCLaunchData(value: unknown): asserts value is CCLaunchData {
  assertObject(value, 'CCLaunchData')
  if (value.version !== 5) throw new Error('version must be 5')
  assertArray(value.providers, 'providers')
  assertArray(value.configs ?? value.launchItems, 'launchItems')
  assertObject(value.selector, 'selector')
}

export function assertCXLandData(value: unknown): asserts value is CXLandData {
  assertObject(value, 'CXLandData')
  if (value.version !== 3) throw new Error('version must be 3')
  assertArray(value.providers, 'providers')
  assertArray(value.configs ?? value.launchItems, 'launchItems')
  assertObject(value.selector, 'selector')
}

export function assertShellConfigData(value: unknown): asserts value is ShellConfigData {
  assertObject(value, 'ShellConfigData')
  if (value.version !== 1) throw new Error('version must be 1')
  assertArray(value.variables, 'variables')
  assertArray(value.pathVariables, 'pathVariables')
  assertArray(value.pathEntries, 'pathEntries')
  assertArray(value.functions, 'functions')
  assertArray(value.aliases, 'aliases')
  assertObject(value.prompt, 'prompt')
  assertObject(value.output, 'output')
}

export function assertAppSettings(value: unknown): asserts value is AppSettings {
  assertObject(value, 'AppSettings')
  if (typeof value.configDir !== 'string') throw new Error('configDir must be a string')
  if (typeof value.keyFilePath !== 'string') throw new Error('keyFilePath must be a string')
  assertObject(value.shellProfiles, 'shellProfiles')
}
