import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, ColorPicker, Collapse, Divider, Button, Space, App, Switch, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons'
import type { EnvVarSetting, EnvVarsMap, McpServer, ProviderEndpoint, ProviderKey, LaunchItem } from '@shared/types'
import { EnvVarEditor } from './EnvVarEditor'
import { KeyEditModal } from '@renderer/modules/shared/launcher/KeyEditModal'
import { McpRefSelector } from '@renderer/modules/shared/launcher/McpRefSelector'
import { McpServerEditModal } from '@renderer/modules/mcp-servers/McpServerEditModal'

const PRESET_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#f5222d']
const { Text } = Typography

export interface ProviderFormValues {
  id?: string
  name: string
  color: string
  kanbanUrl?: string
  endpoints: ProviderEndpoint[]
  keys: ProviderKey[]
  template: { envVars: EnvVarsMap }
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
  initialValues: ProviderFormValues
  title: string
  onCancel: () => void
  onOk: (values: ProviderFormValues) => void
  /** Existing configs to check key usage (for delete confirmation) */
  existingLaunchItems?: LaunchItem[]
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const [form, setForm] = useState<ProviderFormValues>(initialValues)
  const [keyEditOpen, setKeyEditOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<ProviderKey | null>(null)
  const [mcpEditOpen, setMcpEditOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null)

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

  const handleEnvVarRemove = (key: string) => {
    setForm((f) => {
      const { [key]: _, ...rest } = f.template.envVars
      return { ...f, template: { ...f.template, envVars: rest } }
    })
  }

  const handleEnvVarAdd = (keys: string[]) => {
    setForm((f) => {
      const next = { ...f.template.envVars }
      for (const k of keys) {
        if (!(k in next)) next[k] = { value: '', enabled: false }
      }
      return { ...f, template: { ...f.template, envVars: next } }
    })
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
    const usedLaunchItems = existingLaunchItems.filter(
      (c) => c.providerId === providerId && c.keyId === keyId
    )

    if (usedLaunchItems.length > 0) {
      // Key is in use, show confirmation dialog
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
      // Key not in use, delete directly
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
                    placeholder={t('ccLaunch.endpointUrlPlaceholder')}
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
          <Form.Item label={t('ccLaunch.kanbanUrl')}>
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
          <Divider style={{ margin: '8px 0' }}>{t('ccLaunch.defaultEnvTemplate')}</Divider>
          <EnvVarEditor
            mode="template"
            envVars={form.template.envVars}
            onChange={handleEnvVarChange}
            onRemove={handleEnvVarRemove}
            onAdd={handleEnvVarAdd}
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
