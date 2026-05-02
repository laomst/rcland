import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, Spin } from 'antd'
import { ShopOutlined, SettingOutlined, MenuOutlined } from '@ant-design/icons'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { ProviderTab } from '../components/ProviderTab'
import { ConfigTab } from '../components/ConfigTab'
import { SelectorTab } from '../components/SelectorTab'

export default function CCConfigPage(): React.ReactElement {
  const { t } = useTranslation()
  const loadData = useCCLaunchStore((s) => s.loadData)
  const dataLoaded = useCCLaunchStore((s) => s.dataLoaded)
  const loading = useCCLaunchStore((s) => s.loading)

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
    <Tabs
      defaultActiveKey="configs"
      items={[
        {
          key: 'configs',
          label: t('ccLaunch.configTab'),
          icon: <SettingOutlined />,
          children: <ConfigTab />
        },
        {
          key: 'providers',
          label: t('ccLaunch.providerTab'),
          icon: <ShopOutlined />,
          children: <ProviderTab />
        },
        {
          key: 'selector',
          label: t('ccLaunch.selectorTab'),
          icon: <MenuOutlined />,
          children: <SelectorTab />
        }
      ]}
    />
  )
}
