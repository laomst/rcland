import { useState } from 'react'
import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'
import { EnvVarPage } from '../shell-env'
import { PathPage } from '../shell-path'
import { FunctionPage } from '../shell-functions'
import { AliasPage } from '../shell-aliases'
import { SystemProxyPage } from '../system-proxy'

type SystemTab = 'env' | 'path' | 'functions' | 'aliases' | 'systemProxy'

export function SystemSettingsPage(): React.ReactElement {
  const { t } = useTranslation()
  const [tab, setTab] = useState<SystemTab>('env')

  const options = [
    { label: t('nav.env'), value: 'env' as const },
    { label: t('nav.path'), value: 'path' as const },
    { label: t('nav.functions'), value: 'functions' as const },
    { label: t('nav.aliases'), value: 'aliases' as const },
    { label: t('nav.systemProxy'), value: 'systemProxy' as const },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={options}
          value={tab}
          onChange={(v) => setTab(v as SystemTab)}
          block
        />
      </div>
      {tab === 'env' && <EnvVarPage />}
      {tab === 'path' && <PathPage />}
      {tab === 'functions' && <FunctionPage />}
      {tab === 'aliases' && <AliasPage />}
      {tab === 'systemProxy' && <SystemProxyPage />}
    </div>
  )
}
