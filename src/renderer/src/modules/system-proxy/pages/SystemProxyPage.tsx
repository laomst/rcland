import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, Input, Space, Spin, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { getSystemProxyLabels, type SystemProxyConfig } from '@shared/system-proxy'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { DEFAULT_PROXY_FUNCTION_NAMES } from '@shared/types'

const { Text, Title } = Typography

export function SystemProxyPage(): React.ReactElement {
  const { t } = useTranslation()
  const [proxyConfig, setProxyConfig] = useState<SystemProxyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const proxyLabels = getSystemProxyLabels(t)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const loadProxy = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.readOsProxy()
      setProxyConfig(data)
    } catch {
      setProxyConfig(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProxy()
  }, [])

  if (loading || !proxyConfig) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('systemProxy.title')}</Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t('systemProxy.hint')}
      />
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: OS Proxy Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Title level={5} style={{ margin: 0 }}>{t('systemProxy.proxyItems')}</Title>
            <Button icon={<ReloadOutlined />} size="small" onClick={loadProxy}>
              {t('systemProxy.refresh')}
            </Button>
          </div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {t(navigator.platform.startsWith('Win')
              ? 'systemProxy.proxySourceHint_windows'
              : navigator.platform.includes('Mac')
                ? 'systemProxy.proxySourceHint_macos'
                : 'systemProxy.proxySourceHint_linux')}
          </Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {proxyConfig.proxyEnvVars.map((item) => (
              <Card key={item.type} size="small">
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{proxyLabels[item.type]}</Text>
                <Text code={!!item.value} type={item.value ? 'success' : 'secondary'}>
                  {item.value || t('systemProxy.notConfigured')}
                </Text>
              </Card>
            ))}
          </Space>
        </div>

        {/* Right: Function Names Configuration */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{t('systemProxy.functionNames')}</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{t('systemProxy.funcNameHint')}</Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {[
              { key: 'proxyOn' as const, label: t('systemProxy.proxyOnFunc'), desc: t('systemProxy.funcOnDesc') },
              { key: 'proxyOff' as const, label: t('systemProxy.proxyOffFunc'), desc: t('systemProxy.funcOffDesc') },
              { key: 'proxyStatus' as const, label: t('systemProxy.proxyStatusFunc'), desc: t('systemProxy.funcStatusDesc') },
            ].map(({ key, label, desc }) => {
              const value = settings?.proxyFunctionNames?.[key] ?? DEFAULT_PROXY_FUNCTION_NAMES[key]
              return (
                <Card key={key} size="small">
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>{label}</Text>
                  <Input
                    value={value}
                    onChange={(e) => {
                      const current = settings?.proxyFunctionNames ?? DEFAULT_PROXY_FUNCTION_NAMES
                      updateSettings({
                        proxyFunctionNames: { ...current, [key]: e.target.value }
                      })
                    }}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        const current = settings?.proxyFunctionNames ?? DEFAULT_PROXY_FUNCTION_NAMES
                        updateSettings({
                          proxyFunctionNames: { ...current, [key]: DEFAULT_PROXY_FUNCTION_NAMES[key] }
                        })
                      }
                    }}
                    placeholder={DEFAULT_PROXY_FUNCTION_NAMES[key]}
                  />
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{desc}</Text>
                </Card>
              )
            })}
          </Space>
        </div>
      </div>
    </div>
  )
}
