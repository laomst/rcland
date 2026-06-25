import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented, Spin } from 'antd'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import { ProviderTab } from '../components/ProviderTab'
import { LaunchItemTab } from '../components/LaunchItemTab'
import { SelectorTab } from '../components/SelectorTab'
import { EnvDictTab } from '@renderer/modules/claude-env-dict/components/EnvDictTab'

type CCTab = 'configs' | 'providers' | 'env-dict' | 'selector'

export default function CCLaunchItemPage(): React.ReactElement {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CCTab>('configs')
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

  const options = [
    { label: t('ccLaunch.launchItemTab'), value: 'configs' as const },
    { label: t('ccLaunch.providerTab'), value: 'providers' as const },
    { label: t('claudeEnvDict.tabTitle'), value: 'env-dict' as const },
    { label: t('ccLaunch.selectorTab'), value: 'selector' as const },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented options={options} value={tab} onChange={(v) => setTab(v as CCTab)} block />
      </div>
      {tab === 'configs' && <LaunchItemTab />}
      {tab === 'providers' && <ProviderTab />}
      {tab === 'env-dict' && <EnvDictTab />}
      {tab === 'selector' && <SelectorTab />}
    </div>
  )
}
