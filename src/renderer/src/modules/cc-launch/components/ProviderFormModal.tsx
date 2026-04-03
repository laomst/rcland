import { useState } from 'react'
import { Input, Modal, Form, ColorPicker, Divider, Button, Space, App } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons'
import type { EnvVarSetting, EnvVarsMap, ProviderEndpoint, ProviderKey, ConfigSet } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS } from '@shared/types'
import { EnvVarEditor } from './EnvVarEditor'
import { KeyEditModal } from './KeyEditModal'

const PRESET_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#f5222d']

/** Ensure all env var keys have a setting entry so EnvVarEditor renders them */
function withDefaults(envVars?: EnvVarsMap): EnvVarsMap {
  const result: EnvVarsMap = {}
  for (const key of CLAUDE_ENV_VAR_KEYS) {
    result[key] = envVars?.[key] ?? { value: '', enabled: false }
  }
  return result
}

export interface ProviderFormValues {
  id?: string
  name: string
  color: string
  endpoints: ProviderEndpoint[]
  keys: ProviderKey[]
  template: { envVars: EnvVarsMap }
}

export function ProviderFormModal({
  open,
  initialValues,
  title,
  onCancel,
  onOk,
  existingConfigs = []
}: {
  open: boolean
  initialValues: ProviderFormValues
  title: string
  onCancel: () => void
  onOk: (values: ProviderFormValues) => void
  /** Existing configs to check key usage (for delete confirmation) */
  existingConfigs?: ConfigSet[]
}): React.ReactElement {
  const { modal } = App.useApp()
  const [form, setForm] = useState<ProviderFormValues>(initialValues)
  const [keyEditOpen, setKeyEditOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<ProviderKey | null>(null)

  const handleOpen = () => setForm(initialValues)

  const handleEnvVarChange = (key: string, setting: EnvVarSetting) => {
    setForm((f) => ({
      ...f,
      template: {
        ...f.template,
        envVars: { ...f.template.envVars, [key]: setting }
      }
    }))
  }

  // Endpoint handlers
  const updateEndpoint = (idx: number, patch: Partial<ProviderEndpoint>) => {
    setForm((f) => ({
      ...f,
      endpoints: f.endpoints.map((ep, i) => (i === idx ? { ...ep, ...patch } : ep))
    }))
  }

  const addEndpoint = () => {
    setForm((f) => ({
      ...f,
      endpoints: [...f.endpoints, { id: crypto.randomUUID(), label: '', url: '' }]
    }))
  }

  const removeEndpoint = (idx: number) => {
    setForm((f) => ({
      ...f,
      endpoints: f.endpoints.filter((_, i) => i !== idx)
    }))
  }

  // Key handlers
  const openKeyEdit = (key: ProviderKey | null) => {
    setEditingKey(key)
    setKeyEditOpen(true)
  }

  const handleKeyEditConfirm = (key: ProviderKey) => {
    setForm((f) => {
      const existing = f.keys.find((k) => k.id === key.id)
      if (existing) {
        return { ...f, keys: f.keys.map((k) => (k.id === key.id ? key : k)) }
      } else {
        return { ...f, keys: [...f.keys, key] }
      }
    })
    setKeyEditOpen(false)
    setEditingKey(null)
  }

  const removeKey = (keyId: string, keyLabel: string) => {
    // Check if this key is being used by any config
    const providerId = form.id
    const usedConfigs = existingConfigs.filter(
      (c) => c.providerId === providerId && c.keyId === keyId
    )

    if (usedConfigs.length > 0) {
      // Key is in use, show confirmation dialog
      const configNames = usedConfigs.map((c) => c.funcName).join('、')
      modal.confirm({
        title: '密钥正在使用中',
        content: (
          <div>
            <p>密钥「{keyLabel}」正被以下配置使用：</p>
            <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4, margin: '8px 0' }}>
              {configNames}
            </p>
            <p>删除后，这些配置将无法正常工作。确定要强制删除吗？</p>
          </div>
        ),
        okText: '强制删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          setForm((f) => ({
            ...f,
            keys: f.keys.filter((k) => k.id !== keyId)
          }))
        }
      })
    } else {
      // Key not in use, delete directly
      setForm((f) => ({
        ...f,
        keys: f.keys.filter((k) => k.id !== keyId)
      }))
    }
  }

  const hasValidEndpoint = form.endpoints.some((ep) => ep.url.trim())

  return (
    <>
      <Modal
        title={title}
        open={open}
        afterOpenChange={(vis) => { if (vis) handleOpen() }}
        onOk={() => onOk(form)}
        onCancel={onCancel}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !form.name.trim() || !hasValidEndpoint }}
        width={700}
      >
        <Form
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
          labelAlign="left"
          colon={false}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="供应商名称" required style={{ marginBottom: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如: GLM (智谱 AI)"
                style={{ flex: 1 }}
              />
              <ColorPicker
                value={form.color}
                presets={[{ label: '预设', colors: PRESET_COLORS }]}
                onChangeComplete={(color) => setForm((f) => ({ ...f, color: color.toHexString() }))}
              />
            </Space.Compact>
          </Form.Item>
          <Form.Item label="接入点 (URL)" required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.endpoints.map((ep, idx) => (
                <Space.Compact key={ep.id} style={{ width: '100%' }}>
                  <Input
                    value={ep.label}
                    onChange={(e) => updateEndpoint(idx, { label: e.target.value })}
                    placeholder="标签，如: 默认"
                    style={{ width: 120, flexShrink: 0 }}
                  />
                  <Input
                    value={ep.url}
                    onChange={(e) => updateEndpoint(idx, { url: e.target.value })}
                    placeholder="如: https://open.bigmodel.cn/api/anthropic"
                    style={{ fontFamily: 'monospace', flex: 1 }}
                  />
                  {form.endpoints.length > 1 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeEndpoint(idx)}
                    />
                  )}
                </Space.Compact>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={addEndpoint} block>
                添加接入点
              </Button>
            </div>
          </Form.Item>
          <Form.Item label="密钥 (Token)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.keys.length === 0 && (
                <div style={{ color: '#999', fontSize: 13 }}>暂无密钥，点击下方按钮添加</div>
              )}
              {form.keys.map((key) => (
                <Space.Compact key={key.id} style={{ width: '100%' }}>
                  <Input
                    value={key.label}
                    disabled
                    style={{ width: 140, flexShrink: 0 }}
                  />
                  <Input
                    value={key.token ? '•••••••••••• (已加密)' : '(未设置)'}
                    disabled
                    style={{ fontFamily: 'monospace', flex: 1, color: key.token ? undefined : '#999' }}
                    prefix={<LockOutlined style={{ color: '#999', marginRight: 4 }} />}
                  />
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openKeyEdit(key)}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeKey(key.id, key.label)}
                  />
                </Space.Compact>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => openKeyEdit(null)} block>
                添加密钥
              </Button>
            </div>
          </Form.Item>
          <Divider style={{ margin: '8px 0' }}>默认环境变量模板</Divider>
          <EnvVarEditor envVars={form.template.envVars} onChange={handleEnvVarChange} />
        </Form>
      </Modal>
      <KeyEditModal
        open={keyEditOpen}
        editingKey={editingKey}
        onConfirm={handleKeyEditConfirm}
        onCancel={() => { setKeyEditOpen(false); setEditingKey(null) }}
      />
    </>
  )
}

export { withDefaults }
