import type { ShellType, ShellProfileConfig } from '../shell'
import type { TFunction } from 'i18next'

export type AppPage = '/env' | '/path' | '/functions' | '/aliases' | '/system-proxy' | '/ccland' | '/cxland'

export const getAppPageLabels = (t: TFunction): Record<AppPage, string> => ({
  '/env': t('nav.env'),
  '/path': t('nav.path'),
  '/functions': t('nav.functions'),
  '/aliases': t('nav.aliases'),
  '/system-proxy': t('nav.systemProxy'),
  '/ccland': t('nav.ccland'),
  '/cxland': t('nav.cxland'),
})

export interface ProxyFunctionNames {
  proxyOn: string
  proxyOff: string
  proxyStatus: string
}

export const DEFAULT_PROXY_FUNCTION_NAMES: ProxyFunctionNames = {
  proxyOn: 'proxy-on',
  proxyOff: 'proxy-off',
  proxyStatus: 'proxy-status'
}

export interface AppSettings {
  configDir: string
  keyFilePath: string
  shellProfiles: Partial<Record<ShellType, ShellProfileConfig>>
  defaultPage?: AppPage
  language?: 'zh-CN' | 'en'
  proxyFunctionNames?: ProxyFunctionNames
}
