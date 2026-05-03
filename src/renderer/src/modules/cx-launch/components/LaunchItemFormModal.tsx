import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, Space, Select, Typography, Switch } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { CXProvider } from '@shared/types'

const { Text } = Typography

export interface CXLaunchItemFormValues {
  providerId: string
  endpointId: string
  keyId: string
  name: string
  funcName: string
  model?: string
  passthrough?: boolean
  useSystemProxy?: boolean
  localOnly?: boolean
}

interface LaunchItemFormModalProps {
  open: boolean
  title: string
  providers: CXProvider[]
  initialValues: CXLaunchItemFormValues
  okText: string
  okDisabled?: boolean
  onCancel: () => void
  onOk: (values: CXLaunchItemFormValues) => void
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
  const [form, setForm] = useState<CXLaunchItemFormValues>(initialValues)

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
      model: form.model,
      passthrough: form.passthrough,
      useSystemProxy: form.useSystemProxy,
      localOnly: form.localOnly
    })
  }

  const provider = providers.find((p) => p.id === form.providerId)
  const selectedKey = provider?.keys.find((k) => k.id === form.keyId)
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
                直接透传到 codex，不设置 API 密钥和端点
              </Text>
            )}
          </Space>
        </Form.Item>

        {isPassthrough ? (
          <>
            <Form.Item label={t('ccLaunch.configName')} required>
              <Input
                value={form.name ?? ''}
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => {
                    const shouldAutoGen = !f.funcName || f.funcName.startsWith('cx-')
                    const autoFuncName = name.trim()
                      ? `cx-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\s+/g, '-')}`
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
                placeholder="cx-direct"
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
              <Select
                value={form.keyId}
                onChange={(val) => setForm((f) => ({ ...f, keyId: val }))}
                placeholder={hasNoKeys ? t('ccLaunch.noKeyHint') : t('ccLaunch.selectKey')}
                style={{ width: '100%' }}
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
                    const shouldAutoGen = !f.funcName || f.funcName.startsWith('cx-')
                    const autoFuncName = name.trim()
                      ? `cx-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/\s+/g, '-')}`
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
                placeholder="cx-glm5"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('cxLaunch.model')}>
              <Input
                value={form.model ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="gpt-5.4 (可选)"
              />
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
