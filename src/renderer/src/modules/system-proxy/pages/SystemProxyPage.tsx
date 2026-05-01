import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, Input, Modal, Space, Spin, Typography } from 'antd'
import { ImportOutlined } from '@ant-design/icons'
import { getSystemProxyLabels, parseSystemProxyExportScript } from '@shared/system-proxy'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'

const { TextArea } = Input
const { Text, Title } = Typography

export function SystemProxyPage(): React.ReactElement {
  const { t } = useTranslation()
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const systemProxy = useShellConfigStore((s) => s.shellConfig.systemProxy)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const saveError = useShellConfigStore((s) => s.saveError)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const updateSystemProxyEnvVar = useShellConfigStore((s) => s.updateSystemProxyEnvVar)
  const importSystemProxyEnvVars = useShellConfigStore((s) => s.importSystemProxyEnvVars)
  const proxyLabels = getSystemProxyLabels(t)

  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  if (!dataLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  const handleImport = () => {
    try {
      const imported = parseSystemProxyExportScript(importText)
      importSystemProxyEnvVars(imported)
      setImportText('')
      setImportError(null)
      setImportOpen(false)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    }
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
      {saveError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('common.operationFailed', { error: saveError })}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>{t('systemProxy.proxyItems')}</Text>
        <Button type="link" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
          {t('systemProxy.importExports')}
        </Button>
      </div>

      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {systemProxy.proxyEnvVars.map((item, index) => (
          <Card key={item.type} size="small">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 220px) 1fr', gap: 16, alignItems: 'center' }}>
              <Text strong>{proxyLabels[item.type]}</Text>
              <Input
                value={item.value}
                placeholder={t('systemProxy.valuePlaceholder')}
                onChange={(event) => updateSystemProxyEnvVar(index, event.target.value)}
              />
            </div>
          </Card>
        ))}
      </Space>

      <Modal
        open={importOpen}
        title={t('systemProxy.importTitle')}
        okText={t('systemProxy.importExports')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !importText.trim() }}
        onOk={handleImport}
        onCancel={() => {
          setImportOpen(false)
          setImportError(null)
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {importError && (
            <Alert
              type="error"
              showIcon
              message={t('common.operationFailed', { error: importError })}
            />
          )}
          <TextArea
            value={importText}
            placeholder={t('systemProxy.exportPlaceholder')}
            onChange={(event) => setImportText(event.target.value)}
            autoSize={{ minRows: 6, maxRows: 12 }}
            spellCheck={false}
            style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace' }}
          />
        </Space>
      </Modal>
    </div>
  )
}
