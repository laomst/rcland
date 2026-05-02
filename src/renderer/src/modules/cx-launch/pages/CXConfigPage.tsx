import React, { useEffect } from 'react'
import { Tabs, Spin, Alert } from 'antd'
import { SettingOutlined, ShopOutlined, MenuOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { ConfigTab } from '../components/ConfigTab'
import { ProviderTab } from '../components/ProviderTab'
import { SelectorTab } from '../components/SelectorTab'

export function CXConfigPage(): React.ReactElement {
  const { t } = useTranslation()
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
          { key: 'configs', label: t('cxLaunch.configTab'), icon: <SettingOutlined />, children: <ConfigTab /> },
          { key: 'providers', label: t('cxLaunch.providerTab'), icon: <ShopOutlined />, children: <ProviderTab /> },
          { key: 'selector', label: t('cxLaunch.selectorTab'), icon: <MenuOutlined />, children: <SelectorTab /> }
        ]}
      />
    </div>
  )
}
