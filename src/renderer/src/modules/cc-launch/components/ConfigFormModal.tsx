import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, Space, Select, Divider, Typography, Button, Switch } from 'antd'
import { PlusOutlined, LockOutlined } from '@ant-design/icons'
import type { ConfigSet, Provider, EnvVarSetting } from '@shared/types'
import { EnvVarEditor } from './EnvVarEditor'
import type { ConfigFormValues } from './config-update'

const { Text } = Typography

type FormValues = ConfigFormValues

interface ConfigFormModalProps {
  open: boolean
  title: string
  providers: Provider[]
  initialValues: FormValues
  okText: string
  okDisabled?: boolean
  onCancel: () => void
  onOk: (values: FormValues) => void
  onAddKey?: () => void
}

export function ConfigFormModal({
  open,
  title,
  providers,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk,
  onAddKey
}: ConfigFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormValues>(initialValues)

  const handleOpen = () => setForm(initialValues)

  const handleEnvVarChange = (key: string, setting: EnvVarSetting) => {
    setForm((f) => ({ ...f, envVars: { ...f.envVars, [key]: setting } }))
  }

  const handleProviderChange = (providerId: string) => {
    const newProvider = providers.find((p) => p.id === providerId)
    const firstEndpointId = newProvider?.endpoints?.[0]?.id ?? ''
    const firstKeyId = newProvider?.keys?.[0]?.id ?? ''
    // 切换供应商时清空所有关联字段
    const templateEnvVars = newProvider?.template?.envVars ?? {}
    setForm({
      providerId,
      endpointId: firstEndpointId,
      keyId: firstKeyId,
      name: '',
      funcName: '',
      envVars: { ...templateEnvVars },
      localOnly: form.localOnly
    })
  }

  const provider = providers.find((p) => p.id === form.providerId)
  const selectedKey = provider?.keys.find((k) => k.id === form.keyId)
  const hasNoKeys = !provider?.keys?.length

  return (
    <Modal
      title={title}
      open={open}
      afterOpenChange={(vis) => { if (vis) handleOpen() }}
      onOk={() => onOk(form)}
      onCancel={onCancel}
      okText={okText}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: okDisabled ?? (!(form.name?.trim() || form.funcName?.trim()) || !form.providerId || !form.keyId) }}
      width={700}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('ccLaunch.provider')}>
          <Select
            value={form.providerId}
            onChange={handleProviderChange}
            placeholder={t('ccLaunch.selectProvider')}
            style={{ width: '100%' }}
            options={providers.map((p) => ({
              value: p.id,
              label: (
                <Space>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#1677ff', display: 'inline-block' }} />
                  {p.name}
                </Space>
              )
            }))}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.endpoint')}>
          <Select
            value={form.endpointId}
            onChange={(val) => setForm((f) => ({ ...f, endpointId: val }))}
            placeholder={t('ccLaunch.selectEndpoint')}
            style={{ width: '100%' }}
            options={(provider?.endpoints ?? []).map((ep) => ({
              value: ep.id,
              label: ep.label ? `${ep.label} — ${ep.url}` : ep.url
            }))}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.key')} required>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={form.keyId}
              onChange={(val) => setForm((f) => ({ ...f, keyId: val }))}
              placeholder={hasNoKeys ? t('ccLaunch.noKeyHint') : t('ccLaunch.selectKey')}
              style={{ flex: 1 }}
              status={!selectedKey && form.keyId ? 'error' : undefined}
              options={(provider?.keys ?? []).map((k) => ({
                value: k.id,
                label: (
                  <Space>
                    <LockOutlined style={{ color: '#999' }} />
                    {k.label}
                    {k.token && <Text type="success" style={{ fontSize: 11 }}>{t('ccLaunch.keyEncrypted')}</Text>}
                  </Space>
                )
              }))}
            />
            {onAddKey && (
              <Button icon={<PlusOutlined />} onClick={onAddKey}>
                {t('common.new')}
              </Button>
            )}
          </Space.Compact>
          {!selectedKey && form.keyId && (
            <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              {t('ccLaunch.keyDeletedError')}
            </Text>
          )}
        </Form.Item>
        <Form.Item label={t('ccLaunch.configName')} required>
          <Input
            value={form.name ?? ''}
            onChange={(e) => {
              const name = e.target.value
              setForm((f) => {
                // Auto-generate funcName from name if funcName is empty or was auto-generated
                const shouldAutoGen = !f.funcName || f.funcName.startsWith('cc-')
                const autoFuncName = name.trim()
                  ? `cc-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\s+/g, '-')}`
                  : ''
                return { ...f, name, funcName: shouldAutoGen ? autoFuncName : f.funcName }
              })
            }}
            placeholder={t('ccLaunch.configNamePlaceholder')}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.funcName')} extra={t('ccLaunch.funcNameHint')}>
          <Input
            value={form.funcName ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, funcName: e.target.value }))}
            placeholder={t('ccLaunch.funcNamePlaceholder')}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Form.Item label={t('common.localOnly')}>
          <Space>
            <Switch
              checked={form.localOnly ?? false}
              onChange={(checked) => setForm((f) => ({ ...f, localOnly: checked }))}
            />
            {form.localOnly && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('common.localOnlyHint')}
              </Text>
            )}
          </Space>
        </Form.Item>
        <Divider style={{ margin: '8px 0' }}>{t('ccLaunch.claudeEnvVars')}</Divider>
        <EnvVarEditor envVars={form.envVars} onChange={handleEnvVarChange} />
      </Form>
    </Modal>
  )
}
