import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, ColorPicker, Button, Space, App, Switch, Typography, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons'
import type { CXEndpoint, CXProviderKey, CXLaunchItem } from '@shared/types'
import { KeyEditModal } from '@renderer/modules/shared/launcher/KeyEditModal'

const PRESET_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#f5222d']
const { Text } = Typography

export interface CXProviderFormValues {
  id?: string
  name: string
  color: string
  kanbanUrl?: string
  wireApi: 'responses' | 'chat'
  endpoints: CXEndpoint[]
  keys: CXProviderKey[]
}

export function ProviderFormModal({
  open,
  initialValues,
  title,
  onCancel,
  onOk,
  existingLaunchItems = []
}: {
  open: boolean
  initialValues: CXProviderFormValues
  title: string
  onCancel: () => void
  onOk: (values: CXProviderFormValues) => void
  existingLaunchItems?: CXLaunchItem[]
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const [form, setForm] = useState<CXProviderFormValues>(initialValues)
  const [keyEditOpen, setKeyEditOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<CXProviderKey | null>(null)

  const handleOpen = () => setForm(initialValues)

  // Endpoint handlers
  const updateEndpoint = (idx: number, patch: Partial<CXEndpoint>) => {
    setForm((f) => ({
      ...f,
      endpoints: f.endpoints.map((ep, i) => (i === idx ? { ...ep, ...patch } : ep))
    }))
  }

  const addEndpoint = () => {
    setForm((f) => ({
      ...f,
      endpoints: [...f.endpoints, { id: crypto.randomUUID(), label: '', url: '', useSystemProxy: false }]
    }))
  }

  const removeEndpoint = (idx: number) => {
    setForm((f) => ({
      ...f,
      endpoints: f.endpoints.filter((_, i) => i !== idx)
    }))
  }

  // Key handlers
  const openKeyEdit = (key: CXProviderKey | null) => {
    setEditingKey(key)
    setKeyEditOpen(true)
  }

  const handleKeyEditConfirm = (key: CXProviderKey) => {
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
    const providerId = form.id
    const usedLaunchItems = existingLaunchItems.filter(
      (c) => c.providerId === providerId && c.keyId === keyId
    )

    if (usedLaunchItems.length > 0) {
      const launchItemNames = usedLaunchItems.map((c) => c.funcName).join('、')
      modal.confirm({
        title: t('ccLaunch.keyInUse'),
        content: (
          <div>
            <p>{t('ccLaunch.keyInUseDesc', { label: keyLabel })}</p>
            <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4, margin: '8px 0' }}>
              {launchItemNames}
            </p>
            <p>{t('ccLaunch.keyInUseWarning')}</p>
          </div>
        ),
        okText: t('ccLaunch.forceDelete'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => {
          setForm((f) => ({
            ...f,
            keys: f.keys.filter((k) => k.id !== keyId)
          }))
        }
      })
    } else {
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
        okText={t('common.save')}
        cancelText={t('common.cancel')}
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
          <Form.Item label={t('ccLaunch.providerName')} required style={{ marginBottom: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('ccLaunch.providerNamePlaceholder')}
                style={{ flex: 1 }}
              />
              <ColorPicker
                value={form.color}
                presets={[{ label: t('ccLaunch.presetColor'), colors: PRESET_COLORS }]}
                onChangeComplete={(color) => setForm((f) => ({ ...f, color: color.toHexString() }))}
              />
            </Space.Compact>
          </Form.Item>

          {/* Wire API */}
          <Form.Item label="Wire API">
            <Radio.Group
              value={form.wireApi}
              onChange={(e) => setForm((f) => ({ ...f, wireApi: e.target.value }))}
            >
              <Radio.Button value="chat">Chat</Radio.Button>
              <Radio.Button value="responses">Responses</Radio.Button>
            </Radio.Group>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              {t('cxLaunch.wireApiHint')}
            </Text>
          </Form.Item>

          <Form.Item label={t('ccLaunch.endpointUrl')} required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.endpoints.map((ep, idx) => (
                <div
                  key={ep.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: form.endpoints.length > 1 ? '120px minmax(0, 1fr) auto auto' : '120px minmax(0, 1fr) auto',
                    gap: 8,
                    alignItems: 'center'
                  }}
                >
                  <Input
                    value={ep.label}
                    onChange={(e) => updateEndpoint(idx, { label: e.target.value })}
                    placeholder={t('ccLaunch.endpointLabelPlaceholder')}
                  />
                  <Input
                    value={ep.url}
                    onChange={(e) => updateEndpoint(idx, { url: e.target.value })}
                    placeholder={t('cxLaunch.endpointUrlPlaceholder')}
                    style={{ fontFamily: 'monospace', flex: 1 }}
                  />
                  <Space size={6} style={{ whiteSpace: 'nowrap' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{t('ccLaunch.useSystemProxy')}</Text>
                    <Switch
                      size="small"
                      checked={Boolean(ep.useSystemProxy)}
                      onChange={(checked) => updateEndpoint(idx, { useSystemProxy: checked })}
                    />
                  </Space>
                  {form.endpoints.length > 1 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeEndpoint(idx)}
                    />
                  )}
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={addEndpoint} block>
                {t('ccLaunch.addEndpoint')}
              </Button>
            </div>
          </Form.Item>
          <Form.Item label={t('cxLaunch.kanbanUrl')}>
            <Input
              value={form.kanbanUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, kanbanUrl: e.target.value }))}
              placeholder="https://..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item label={t('ccLaunch.tokenLabel')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.keys.length === 0 && (
                <div style={{ color: '#999', fontSize: 13 }}>{t('ccLaunch.noKeys')}</div>
              )}
              {form.keys.map((key) => (
                <Space.Compact key={key.id} style={{ width: '100%' }}>
                  <Input
                    value={key.label}
                    disabled
                    style={{ width: 140, flexShrink: 0 }}
                  />
                  <Input
                    value={key.token ? t('ccLaunch.encryptedToken') : t('common.notSet')}
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
                {t('ccLaunch.addKey')}
              </Button>
            </div>
          </Form.Item>
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
