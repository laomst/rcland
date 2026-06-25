import React, { useEffect, useState } from 'react'
import { Segmented, Spin, Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { useOCLandStore } from '@renderer/stores/useOCLandStore'
import { LaunchItemTab } from '../components/LaunchItemTab'
import { ProviderTab } from '../components/ProviderTab'
import { SelectorTab } from '../components/SelectorTab'

type OCTab = 'configs' | 'providers' | 'selector'

export function OCLaunchItemPage(): React.ReactElement {
  const { t } = useTranslation()
  const [tab, setTab] = useState<OCTab>('configs')
  const loadData = useOCLandStore((s) => s.loadData)
  const dataLoaded = useOCLandStore((s) => s.dataLoaded)
  const loading = useOCLandStore((s) => s.loading)
  const saveError = useOCLandStore((s) => s.saveError)

  useEffect(() => {
    if (!dataLoaded && !loading) {
      loadData()
    }
  }, [dataLoaded, loading, loadData])

  if (loading || !dataLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  const options = [
    { label: t('ocLaunch.launchItemTab'), value: 'configs' as const },
    { label: t('ocLaunch.providerTab'), value: 'providers' as const },
    { label: t('ocLaunch.selectorTab'), value: 'selector' as const },
  ]

  return (
    <div>
      {saveError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('common.operationFailed', { error: saveError })}
        />
      )}
      <div style={{ marginBottom: 16 }}>
        <Segmented options={options} value={tab} onChange={(v) => setTab(v as OCTab)} block />
      </div>
      {tab === 'configs' && <LaunchItemTab />}
      {tab === 'providers' && <ProviderTab />}
      {tab === 'selector' && <SelectorTab />}
    </div>
  )
}
