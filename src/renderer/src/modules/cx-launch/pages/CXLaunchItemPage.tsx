import React, { useEffect, useState } from 'react'
import { Segmented, Spin, Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { LaunchItemTab } from '../components/LaunchItemTab'
import { ProviderTab } from '../components/ProviderTab'
import { SelectorTab } from '../components/SelectorTab'

type CXTab = 'configs' | 'providers' | 'selector'

export function CXLaunchItemPage(): React.ReactElement {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CXTab>('configs')
  const loadData = useCXLandStore((s) => s.loadData)
  const dataLoaded = useCXLandStore((s) => s.dataLoaded)
  const loading = useCXLandStore((s) => s.loading)
  const saveError = useCXLandStore((s) => s.saveError)

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
    { label: t('cxLaunch.launchItemTab'), value: 'configs' as const },
    { label: t('cxLaunch.providerTab'), value: 'providers' as const },
    { label: t('cxLaunch.selectorTab'), value: 'selector' as const },
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
        <Segmented options={options} value={tab} onChange={(v) => setTab(v as CXTab)} block />
      </div>
      {tab === 'configs' && <LaunchItemTab />}
      {tab === 'providers' && <ProviderTab />}
      {tab === 'selector' && <SelectorTab />}
    </div>
  )
}
