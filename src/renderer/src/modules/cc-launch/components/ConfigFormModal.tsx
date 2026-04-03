import { useState } from 'react'
import { Input, Modal, Form, Space, Select, Divider, Typography, Button } from 'antd'
import { PlusOutlined, LockOutlined } from '@ant-design/icons'
import type { ConfigSet, Provider, EnvVarSetting } from '@shared/types'
import { EnvVarEditor } from './EnvVarEditor'

const { Text } = Typography

interface FormValues {
  providerId: string
  endpointId: string
  keyId: string
  name: string
  funcName: string
  envVars: ConfigSet['envVars']
}

interface ConfigFormModalProps {
  open: boolean
  title: string
  providers: Provider[]
  initialValues: FormValues
  okText: string
  okDisabled?: boolean
  isEdit?: boolean
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
  isEdit = false,
  onCancel,
  onOk,
  onAddKey
}: ConfigFormModalProps): React.ReactElement {
  const [form, setForm] = useState<FormValues>(initialValues)

  const handleOpen = () => setForm(initialValues)

  const handleEnvVarChange = (key: string, setting: EnvVarSetting) => {
    setForm((f) => ({ ...f, envVars: { ...f.envVars, [key]: setting } }))
  }

  const handleProviderChange = (providerId: string) => {
    const newProvider = providers.find((p) => p.id === providerId)
    const firstEndpointId = newProvider?.endpoints?.[0]?.id ?? ''
    const firstKeyId = newProvider?.keys?.[0]?.id ?? ''
    setForm((f) => ({
      ...f,
      providerId,
      endpointId: firstEndpointId,
      keyId: firstKeyId,
      envVars: {
        ...f.envVars,
        ...newProvider?.template?.envVars
      }
    }))
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
      cancelText="取消"
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
        <Form.Item label="供应商">
          {isEdit ? (
            <Space>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: provider?.color || '#1677ff', display: 'inline-block' }} />
              <Text>{provider?.name ?? '未知'}</Text>
            </Space>
          ) : (
            <Select
              value={form.providerId}
              onChange={handleProviderChange}
              placeholder="选择供应商"
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
          )}
        </Form.Item>
        <Form.Item label="接入点">
          <Select
            value={form.endpointId}
            onChange={(val) => setForm((f) => ({ ...f, endpointId: val }))}
            placeholder="选择接入点"
            style={{ width: '100%' }}
            options={(provider?.endpoints ?? []).map((ep) => ({
              value: ep.id,
              label: ep.label ? `${ep.label} — ${ep.url}` : ep.url
            }))}
          />
        </Form.Item>
        <Form.Item label="密钥" required>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={form.keyId}
              onChange={(val) => setForm((f) => ({ ...f, keyId: val }))}
              placeholder={hasNoKeys ? '暂无密钥，请先添加' : '选择密钥'}
              style={{ flex: 1 }}
              status={!selectedKey && form.keyId ? 'error' : undefined}
              options={(provider?.keys ?? []).map((k) => ({
                value: k.id,
                label: (
                  <Space>
                    <LockOutlined style={{ color: '#999' }} />
                    {k.label}
                    {k.token && <Text type="success" style={{ fontSize: 11 }}>(已加密)</Text>}
                  </Space>
                )
              }))}
            />
            {onAddKey && (
              <Button icon={<PlusOutlined />} onClick={onAddKey}>
                新建
              </Button>
            )}
          </Space.Compact>
          {!selectedKey && form.keyId && (
            <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              引用的密钥已被删除，请重新选择
            </Text>
          )}
        </Form.Item>
        <Form.Item label="名称" required>
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
            placeholder="如: GLM-5.1 模型"
          />
        </Form.Item>
        <Form.Item label="函数名" extra="默认根据名称自动生成，留空即可">
          <Input
            value={form.funcName ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, funcName: e.target.value }))}
            placeholder="如: cc-glm5"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Divider style={{ margin: '8px 0' }}>Claude 环境变量</Divider>
        <EnvVarEditor envVars={form.envVars} onChange={handleEnvVarChange} />
      </Form>
    </Modal>
  )
}
