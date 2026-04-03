import { useEffect } from 'react'
import { Tabs } from 'antd'
import { ShopOutlined, SettingOutlined } from '@ant-design/icons'
import { useAppStore } from '@renderer/stores/useAppStore'
import { ProviderTab } from '../components/ProviderTab'
import { ConfigTab } from '../components/ConfigTab'

export default function CCConfigPage(): React.ReactElement {
  const loadData = useAppStore((s) => s.loadData)

  useEffect(() => {
    loadData()
  }, [loadData])

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
