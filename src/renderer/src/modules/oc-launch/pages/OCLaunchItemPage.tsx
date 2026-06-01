import React, { useEffect } from 'react'
import { Tabs, Spin, Alert } from 'antd'
import { SettingOutlined, ShopOutlined, MenuOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useOCLandStore } from '@renderer/stores/useOCLandStore'
import { LaunchItemTab } from '../components/LaunchItemTab'
import { ProviderTab } from '../components/ProviderTab'
import { SelectorTab } from '../components/SelectorTab'

export function OCLaunchItemPage(): React.ReactElement {
  const { t } = useTranslation()
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
      <Tabs
        defaultActiveKey="configs"
        items={[
          { key: 'configs', label: t('ocLaunch.launchItemTab'), icon: <SettingOutlined />, children: <LaunchItemTab /> },
          { key: 'providers', label: t('ocLaunch.providerTab'), icon: <ShopOutlined />, children: <ProviderTab /> },
          { key: 'selector', label: t('ocLaunch.selectorTab'), icon: <MenuOutlined />, children: <SelectorTab /> }
        ]}
      />
    </div>
  )
}
