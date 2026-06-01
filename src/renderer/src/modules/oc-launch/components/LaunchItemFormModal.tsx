import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, Space, Select, Typography, Switch } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { OCProvider } from '@shared/types'

const { Text } = Typography

export interface OCLaunchItemFormValues {
  providerId: string
  endpointId: string
  keyId: string
  name: string
  funcName: string
  modelId?: string
  passthrough?: boolean
  passthroughCommand?: string
  useSystemProxy?: boolean
  localOnly?: boolean
}

interface LaunchItemFormModalProps {
  open: boolean
  title: string
  providers: OCProvider[]
  initialValues: OCLaunchItemFormValues
  okText: string
  okDisabled?: boolean
  onCancel: () => void
  onOk: (values: OCLaunchItemFormValues) => void
}

export function LaunchItemFormModal({
  open,
  title,
  providers,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk
}: LaunchItemFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const [form, setForm] = useState<OCLaunchItemFormValues>(initialValues)

  const handleOpen = () => setForm(initialValues)

  const handleProviderChange = (providerId: string) => {
    const newProvider = providers.find((p) => p.id === providerId)
    const firstEndpointId = newProvider?.endpoints?.[0]?.id ?? ''
    const firstKeyId = newProvider?.keys?.[0]?.id ?? ''
    setForm({
      providerId,
      endpointId: firstEndpointId,
      keyId: firstKeyId,
      name: '',
      funcName: '',
      modelId: undefined,
      passthrough: form.passthrough,
      useSystemProxy: form.useSystemProxy,
      localOnly: form.localOnly
    })
  }

  const provider = providers.find((p) => p.id === form.providerId)
  const selectedKey = provider?.keys.find((k) => k.id === form.keyId)
  const selectedModel = provider?.models?.find((m) => m.id === form.modelId)
  const modelDeleted = Boolean(form.modelId) && !selectedModel
  const hasNoKeys = !provider?.keys?.length

  const isPassthrough = form.passthrough ?? false
  const canSubmit = form.name?.trim() || form.funcName?.trim()
  const normalValid = canSubmit && form.providerId && form.keyId
  const passthroughValid = canSubmit
  const isValid = isPassthrough ? passthroughValid : normalValid

  return (
    <Modal
      title={title}
      open={open}
      afterOpenChange={(vis) => { if (vis) handleOpen() }}
      onOk={() => onOk(form)}
      onCancel={onCancel}
      okText={okText}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: okDisabled ?? !isValid }}
      width={600}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label="透传模式">
          <Space>
            <Switch
              checked={isPassthrough}
              onChange={(checked) => setForm((f) => ({ ...f, passthrough: checked }))}
            />
            {isPassthrough && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                直接透传到 opencode，不设置 API 密钥和端点
              </Text>
            )}
          </Space>
        </Form.Item>

        {isPassthrough ? (
          <>
            <Form.Item label={t('ocLaunch.configName')} required>
              <Input
                value={form.name ?? ''}
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => {
                    const shouldAutoGen = !f.funcName || f.funcName.startsWith('oc-')
                    const autoFuncName = name.trim()
                      ? `oc-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\s+/g, '-')}`
                      : ''
                    return { ...f, name, funcName: shouldAutoGen ? autoFuncName : f.funcName }
                  })
                }}
                placeholder={t('ocLaunch.configNamePlaceholder')}
              />
            </Form.Item>
            <Form.Item label={t('ocLaunch.funcName')} extra={t('ocLaunch.funcNameHint')}>
              <Input
                value={form.funcName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, funcName: e.target.value }))}
                placeholder="oc-direct"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label="透传命令" extra="留空则默认使用 opencode">
              <Input
                value={form.passthroughCommand ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, passthroughCommand: e.target.value }))}
                placeholder="opencode"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label="系统代理">
              <Switch
                checked={form.useSystemProxy ?? false}
                onChange={(checked) => setForm((f) => ({ ...f, useSystemProxy: checked }))}
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item label={t('ocLaunch.provider')}>
              <Select
                value={form.providerId}
                onChange={handleProviderChange}
                placeholder={t('ocLaunch.selectProvider')}
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
            <Form.Item label={t('ocLaunch.endpoint')}>
              <Select
                value={form.endpointId}
                onChange={(val) => setForm((f) => ({ ...f, endpointId: val }))}
                placeholder={t('ocLaunch.selectEndpoint')}
                style={{ width: '100%' }}
                options={(provider?.endpoints ?? []).map((ep) => ({
                  value: ep.id,
                  label: ep.label ? `${ep.label} — ${ep.url}` : ep.url
                }))}
              />
            </Form.Item>
            <Form.Item label={t('ocLaunch.key')} required>
              <Select
                value={form.keyId}
                onChange={(val) => setForm((f) => ({ ...f, keyId: val }))}
                placeholder={hasNoKeys ? t('ocLaunch.noKeyHint') : t('ocLaunch.selectKey')}
                style={{ width: '100%' }}
                status={!selectedKey && form.keyId ? 'error' : undefined}
                options={(provider?.keys ?? []).map((k) => ({
                  value: k.id,
                  label: (
                    <Space>
                      <LockOutlined style={{ color: '#999' }} />
                      {k.label}
                      {k.token && <Text type="success" style={{ fontSize: 11 }}>{t('ocLaunch.keyEncrypted')}</Text>}
                    </Space>
                  )
                }))}
              />
              {!selectedKey && form.keyId && (
                <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {t('ocLaunch.keyDeletedError')}
                </Text>
              )}
            </Form.Item>
            <Form.Item label={t('ocLaunch.configName')} required>
              <Input
                value={form.name ?? ''}
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => {
                    const shouldAutoGen = !f.funcName || f.funcName.startsWith('oc-')
                    const autoFuncName = name.trim()
                      ? `oc-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\s+/g, '-')}`
                      : ''
                    return { ...f, name, funcName: shouldAutoGen ? autoFuncName : f.funcName }
                  })
                }}
                placeholder={t('ocLaunch.configNamePlaceholder')}
              />
            </Form.Item>
            <Form.Item label={t('ocLaunch.funcName')} extra={t('ocLaunch.funcNameHint')}>
              <Input
                value={form.funcName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, funcName: e.target.value }))}
                placeholder="oc-glm5"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('ocLaunch.model')}>
              <Select
                value={form.modelId}
                onChange={(val) => setForm((f) => ({ ...f, modelId: val }))}
                placeholder={t('ocLaunch.selectModelPlaceholder')}
                style={{ width: '100%' }}
                allowClear
                status={modelDeleted ? 'error' : undefined}
                options={(provider?.models ?? []).map((m) => ({
                  value: m.id,
                  label: m.name
                }))}
              />
              {modelDeleted && (
                <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {t('ocLaunch.modelDeleted')}
                </Text>
              )}
            </Form.Item>
          </>
        )}
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
      </Form>
    </Modal>
  )
}
