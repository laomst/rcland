import { useEffect } from 'react'
import { Tabs, Spin } from 'antd'
import { ShopOutlined, SettingOutlined } from '@ant-design/icons'
import { useAppStore } from '@renderer/stores/useAppStore'
import { ProviderTab } from '../components/ProviderTab'
import { ConfigTab } from '../components/ConfigTab'

export default function CCConfigPage(): React.ReactElement {
  const loadData = useAppStore((s) => s.loadData)
  const dataLoaded = useAppStore((s) => s.dataLoaded)
  const loading = useAppStore((s) => s.loading)

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
          label: '配置管理',
          icon: <SettingOutlined />,
          children: <ConfigTab />
        },
        {
          key: 'providers',
          label: '供应商管理',
          icon: <ShopOutlined />,
          children: <ProviderTab />
        }
      ]}
    />
  )
}
