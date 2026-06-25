import type { ShellType, ShellProfileConfig } from '../shell'
import type { TFunction } from 'i18next'

export type AppPage = '/system' | '/ccland' | '/cxland' | '/ocland'

export const getAppPageLabels = (t: TFunction): Record<AppPage, string> => ({
  '/system': t('nav.system'),
  '/ccland': t('nav.ccland'),
  '/cxland': t('nav.cxland'),
  '/ocland': t('nav.ocland'),
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
