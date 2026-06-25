import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, InputNumber, Modal, Form, ColorPicker, Collapse, Button, Space, App, Switch, Typography, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons'
import type { McpServer, OCEndpoint, OCModel, OCProviderKey, OCLaunchItem, OCSdkType } from '@shared/types'
import { KeyEditModal } from '@renderer/modules/shared/launcher/KeyEditModal'
import { McpRefSelector } from '@renderer/modules/shared/launcher/McpRefSelector'
import { McpServerEditModal } from '@renderer/modules/mcp-servers/McpServerEditModal'

const PRESET_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#f5222d']
const { Text } = Typography

export interface OCProviderFormValues {
  id?: string
  name: string
  color: string
  kanbanUrl?: string
  sdkType: OCSdkType
  endpoints: OCEndpoint[]
  keys: OCProviderKey[]
  models: OCModel[]
  mcpServers?: McpServer[]
  mcpServerRefs?: string[]
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
  initialValues: OCProviderFormValues
  title: string
  onCancel: () => void
  onOk: (values: OCProviderFormValues) => void
  existingLaunchItems?: OCLaunchItem[]
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const [form, setForm] = useState<OCProviderFormValues>(initialValues)
  const [keyEditOpen, setKeyEditOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<OCProviderKey | null>(null)
  const [mcpEditOpen, setMcpEditOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null)

  const handleOpen = () => setForm(initialValues)

  // Endpoint handlers
  const updateEndpoint = (idx: number, patch: Partial<OCEndpoint>) => {
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

  // Model handlers
  const updateModel = (idx: number, patch: Partial<OCModel>) => {
    setForm((f) => ({
      ...f,
      models: f.models.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    }))
  }

  const addModel = () => {
    setForm((f) => ({
      ...f,
      models: [...f.models, { id: '', name: '' }]
    }))
  }

  const removeModel = (idx: number) => {
    setForm((f) => ({
      ...f,
      models: f.models.filter((_, i) => i !== idx)
    }))
  }

  // Key handlers
  const openKeyEdit = (key: OCProviderKey | null) => {
    setEditingKey(key)
    setKeyEditOpen(true)
  }

  const handleKeyEditConfirm = (key: OCProviderKey) => {
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
        title: t('ocLaunch.keyInUse'),
        content: (
          <div>
            <p>{t('ocLaunch.keyInUseDesc', { label: keyLabel })}</p>
            <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4, margin: '8px 0' }}>
              {launchItemNames}
            </p>
            <p>{t('ocLaunch.keyInUseWarning')}</p>
          </div>
        ),
        okText: t('ocLaunch.forceDelete'),
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

  // MCP handlers
  const openMcpEdit = (server: McpServer | null) => {
    setEditingMcp(server)
    setMcpEditOpen(true)
  }

  const handleMcpEditConfirm = (server: McpServer) => {
    setForm((f) => {
      const existing = (f.mcpServers ?? []).find((s) => s.id === server.id)
      if (existing) {
        return { ...f, mcpServers: (f.mcpServers ?? []).map((s) => (s.id === server.id ? server : s)) }
      } else {
        return { ...f, mcpServers: [...(f.mcpServers ?? []), server] }
      }
    })
    setMcpEditOpen(false)
    setEditingMcp(null)
  }

  const removeMcpServer = (id: string) => {
    setForm((f) => ({ ...f, mcpServers: (f.mcpServers ?? []).filter((s) => s.id !== id) }))
  }

  const hasValidEndpoint = form.endpoints.some((ep) => ep.url.trim())

  const handleSubmit = () => {
    // Normalize models: trim id/name, drop empty contextLimit/outputLimit to undefined.
    const models = form.models.map((m) => ({
      id: m.id.trim(),
      name: m.name.trim(),
      contextLimit: typeof m.contextLimit === 'number' ? m.contextLimit : undefined,
      outputLimit: typeof m.outputLimit === 'number' ? m.outputLimit : undefined
    }))

    // Validate models: each must have non-empty id and name.
    if (models.some((m) => !m.id || !m.name)) {
      message.error(t('ocLaunch.modelIdRequired'))
      return
    }

    // Validate models: ids must be unique.
    const uniqueIds = new Set(models.map((m) => m.id))
    if (uniqueIds.size < models.length) {
      message.error(t('ocLaunch.duplicateModelId'))
      return
    }

    onOk({ ...form, models })
  }

  return (
    <>
      <Modal
        title={title}
        open={open}
        afterOpenChange={(vis) => { if (vis) handleOpen() }}
        onOk={handleSubmit}
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
          <Form.Item label={t('ocLaunch.providerName')} required style={{ marginBottom: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('ocLaunch.providerNamePlaceholder')}
                style={{ flex: 1 }}
              />
              <ColorPicker
                value={form.color}
                presets={[{ label: t('ocLaunch.presetColor'), colors: PRESET_COLORS }]}
                onChangeComplete={(color) => setForm((f) => ({ ...f, color: color.toHexString() }))}
              />
            </Space.Compact>
          </Form.Item>

          {/* SDK Type */}
          <Form.Item label={t('ocLaunch.sdkType')}>
            <Radio.Group
              value={form.sdkType}
              onChange={(e) => setForm((f) => ({ ...f, sdkType: e.target.value }))}
            >
              <Radio.Button value="anthropic">Anthropic 兼容 (@ai-sdk/anthropic)</Radio.Button>
              <Radio.Button value="openai-compatible">OpenAI 兼容 (@ai-sdk/openai-compatible)</Radio.Button>
            </Radio.Group>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              {t('ocLaunch.sdkTypeHint')}
            </Text>
          </Form.Item>

          <Form.Item label={t('ocLaunch.endpointUrl')} required>
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
                    placeholder={t('ocLaunch.endpointLabelPlaceholder')}
                  />
                  <Input
                    value={ep.url}
                    onChange={(e) => updateEndpoint(idx, { url: e.target.value })}
                    placeholder={t('ocLaunch.endpointUrlPlaceholder')}
                    style={{ fontFamily: 'monospace', flex: 1 }}
                  />
                  <Space size={6} style={{ whiteSpace: 'nowrap' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{t('ocLaunch.useSystemProxy')}</Text>
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
                {t('ocLaunch.addEndpoint')}
              </Button>
            </div>
          </Form.Item>

          {/* Models */}
          <Form.Item label={t('ocLaunch.models')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.models.length === 0 && (
                <div style={{ color: '#999', fontSize: 13 }}>{t('ocLaunch.noModels')}</div>
              )}
              {form.models.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 120px 120px auto',
                    gap: 8,
                    alignItems: 'center'
                  }}
                >
                  <Input
                    value={m.id}
                    onChange={(e) => updateModel(idx, { id: e.target.value })}
                    placeholder="id"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Input
                    value={m.name}
                    onChange={(e) => updateModel(idx, { name: e.target.value })}
                    placeholder="name"
                  />
                  <InputNumber
                    value={m.contextLimit}
                    onChange={(val) => updateModel(idx, { contextLimit: val ?? undefined })}
                    placeholder="context"
                    style={{ width: '100%' }}
                    min={0}
                  />
                  <InputNumber
                    value={m.outputLimit}
                    onChange={(val) => updateModel(idx, { outputLimit: val ?? undefined })}
                    placeholder="output"
                    style={{ width: '100%' }}
                    min={0}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeModel(idx)}
                  />
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={addModel} block>
                {t('ocLaunch.addModel')}
              </Button>
            </div>
          </Form.Item>

          <Form.Item label={t('ocLaunch.kanbanUrl')}>
            <Input
              value={form.kanbanUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, kanbanUrl: e.target.value }))}
              placeholder="https://..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item label={t('ocLaunch.tokenLabel')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.keys.length === 0 && (
                <div style={{ color: '#999', fontSize: 13 }}>{t('ocLaunch.noKeys')}</div>
              )}
              {form.keys.map((key) => (
                <Space.Compact key={key.id} style={{ width: '100%' }}>
                  <Input
                    value={key.label}
                    disabled
                    style={{ width: 140, flexShrink: 0 }}
                  />
                  <Input
                    value={key.token ? t('ocLaunch.encryptedToken') : t('common.notSet')}
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
                {t('ocLaunch.addKey')}
              </Button>
            </div>
          </Form.Item>
          <Collapse
            ghost
            size="small"
            style={{ marginBottom: 4 }}
            items={[{
              key: 'mcp',
              label: t('mcp.providerMcpSection'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{t('mcp.globalPoolRefs')}</div>
                    <McpRefSelector
                      value={form.mcpServerRefs ?? []}
                      onChange={(ids) => setForm((f) => ({ ...f, mcpServerRefs: ids }))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{t('mcp.privateServers')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(form.mcpServers ?? []).length === 0 && (
                        <div style={{ color: '#999', fontSize: 13 }}>{t('mcp.noPrivateServers')}</div>
                      )}
                      {(form.mcpServers ?? []).map((srv) => (
                        <Space.Compact key={srv.id} style={{ width: '100%' }}>
                          <Input value={srv.name} disabled style={{ flex: 1 }} />
                          <Input value={srv.type} disabled style={{ width: 80 }} />
                          <Button icon={<EditOutlined />} onClick={() => openMcpEdit(srv)} />
                          <Button danger icon={<DeleteOutlined />} onClick={() => removeMcpServer(srv.id)} />
                        </Space.Compact>
                      ))}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => openMcpEdit(null)} block>
                        {t('mcp.addPrivateServer')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            }]}
          />
        </Form>
      </Modal>
      <KeyEditModal
        open={keyEditOpen}
        editingKey={editingKey}
        onConfirm={handleKeyEditConfirm}
        onCancel={() => { setKeyEditOpen(false); setEditingKey(null) }}
      />
      <McpServerEditModal
        open={mcpEditOpen}
        server={editingMcp}
        onOk={handleMcpEditConfirm}
        onCancel={() => { setMcpEditOpen(false); setEditingMcp(null) }}
      />
    </>
  )
}
