import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, Spin } from 'antd'
import { ShopOutlined, SettingOutlined, MenuOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import { ProviderTab } from '../components/ProviderTab'
import { ConfigTab } from '../components/ConfigTab'
import { SelectorTab } from '../components/SelectorTab'
import { EnvDictTab } from '@renderer/modules/claude-env-dict/components/EnvDictTab'

export default function CCConfigPage(): React.ReactElement {
  const { t } = useTranslation()
  const loadData = useCCLaunchStore((s) => s.loadData)
  const dataLoaded = useCCLaunchStore((s) => s.dataLoaded)
  const loading = useCCLaunchStore((s) => s.loading)
  const loadDict = useClaudeEnvDictStore((s) => s.load)
  const dictLoaded = useClaudeEnvDictStore((s) => s.loaded)

  useEffect(() => {
    if (!dataLoaded && !loading) {
      loadData()
    }
    if (!dictLoaded) {
      loadDict()
    }
  }, [dataLoaded, loading, loadData, dictLoaded, loadDict])

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
          key: 'env-dict',
          label: t('claudeEnvDict.tabTitle'),
          icon: <AppstoreOutlined />,
          children: <EnvDictTab />
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
