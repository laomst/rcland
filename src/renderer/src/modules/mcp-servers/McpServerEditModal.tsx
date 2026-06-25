import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Radio,
  Switch,
  InputNumber,
  Button,
  Space,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { McpServer, McpServerType } from '@shared/types'
import { MCP_KEY_RE } from '@shared/types'

const { Text } = Typography

interface KvPair {
  key: string
  value: string
}

interface McpServerFormValues {
  name: string
  key: string
  type: McpServerType
  enabled: boolean
  // stdio
  command: string
  args: string
  env: KvPair[]
  cwd: string
  // remote
  url: string
  headers: KvPair[]
  bearerTokenEnvVar: string
  oauth: boolean
  // common
  startupTimeout: number | null
  toolTimeout: number | null
}

const EMPTY_FORM: McpServerFormValues = {
  name: '',
  key: '',
  type: 'stdio',
  enabled: true,
  command: '',
  args: '',
  env: [],
  cwd: '',
  url: '',
  headers: [],
  bearerTokenEnvVar: '',
  oauth: false,
  startupTimeout: null,
  toolTimeout: null,
}

function serverToForm(server: McpServer): McpServerFormValues {
  return {
    name: server.name,
    key: server.key,
    type: server.type,
    enabled: server.enabled,
    command: server.command ?? '',
    args: server.args ? server.args.join(', ') : '',
    env: server.env ? Object.entries(server.env).map(([k, v]) => ({ key: k, value: v })) : [],
    cwd: server.cwd ?? '',
    url: server.url ?? '',
    headers: server.headers
      ? Object.entries(server.headers).map(([k, v]) => ({ key: k, value: v }))
      : [],
    bearerTokenEnvVar: server.bearerTokenEnvVar ?? '',
    oauth: server.oauth ?? false,
    startupTimeout: server.startupTimeout ?? null,
    toolTimeout: server.toolTimeout ?? null,
  }
}

function formToServer(id: string, values: McpServerFormValues): McpServer {
  const base: McpServer = {
    id,
    name: values.name.trim(),
    key: values.key.trim(),
    type: values.type,
    enabled: values.enabled,
  }
  if (values.type === 'stdio') {
    if (values.command.trim()) base.command = values.command.trim()
    const argsArr = values.args
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    if (argsArr.length > 0) base.args = argsArr
    const envObj = Object.fromEntries(
      values.env.filter((e) => e.key.trim()).map((e) => [e.key.trim(), e.value])
    )
    if (Object.keys(envObj).length > 0) base.env = envObj
    if (values.cwd.trim()) base.cwd = values.cwd.trim()
  } else {
    if (values.url.trim()) base.url = values.url.trim()
    const headersObj = Object.fromEntries(
      values.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value])
    )
    if (Object.keys(headersObj).length > 0) base.headers = headersObj
    if (values.bearerTokenEnvVar.trim()) base.bearerTokenEnvVar = values.bearerTokenEnvVar.trim()
    if (values.oauth) base.oauth = true
  }
  if (values.startupTimeout !== null) base.startupTimeout = values.startupTimeout
  if (values.toolTimeout !== null) base.toolTimeout = values.toolTimeout
  return base
}

interface McpServerEditModalProps {
  open: boolean
  server: McpServer | null // null = add mode
  onOk: (server: McpServer) => void
  onCancel: () => void
}

function KvList({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel = '添加',
}: {
  value: KvPair[]
  onChange: (pairs: KvPair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  addLabel?: string
}): React.ReactElement {
  const handleAdd = () => onChange([...value, { key: '', value: '' }])
  const handleRemove = (idx: number) => onChange(value.filter((_, i) => i !== idx))
  const handleChange = (idx: number, field: 'key' | 'value', v: string) => {
    const next = value.map((p, i) => (i === idx ? { ...p, [field]: v } : p))
    onChange(next)
  }
  return (
    <div>
      {value.map((pair, idx) => (
        <Space key={idx} style={{ display: 'flex', marginBottom: 4 }} align="baseline">
          <Input
            value={pair.key}
            onChange={(e) => handleChange(idx, 'key', e.target.value)}
            placeholder={keyPlaceholder ?? 'Key'}
            style={{ width: 140, fontFamily: 'monospace' }}
          />
          <Input
            value={pair.value}
            onChange={(e) => handleChange(idx, 'value', e.target.value)}
            placeholder={valuePlaceholder ?? 'Value'}
            style={{ width: 200 }}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(idx)}
          />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={handleAdd}>
        {addLabel}
      </Button>
    </div>
  )
}

export function McpServerEditModal({
  open,
  server,
  onOk,
  onCancel,
}: McpServerEditModalProps): React.ReactElement {
  const { t } = useTranslation()
  const isEdit = server !== null
  const [form, setForm] = useState<McpServerFormValues>(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(isEdit ? serverToForm(server!) : EMPTY_FORM)
    }
  }, [open, server, isEdit])

  const setField = <K extends keyof McpServerFormValues>(
    field: K,
    value: McpServerFormValues[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }))

  const keyError =
    form.key.trim() && !MCP_KEY_RE.test(form.key.trim())
      ? t('mcp.keyHelp')
      : undefined

  const canSubmit =
    form.name.trim() &&
    form.key.trim() &&
    MCP_KEY_RE.test(form.key.trim())

  const handleOk = () => {
    if (!canSubmit) return
    const id = isEdit ? server!.id : crypto.randomUUID()
    onOk(formToServer(id, form))
  }

  return (
    <Modal
      title={isEdit ? t('mcp.editServer') : t('mcp.addServer')}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !canSubmit }}
      width={580}
      destroyOnClose
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('mcp.name')} required>
          <Input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder={t('mcp.name')}
          />
        </Form.Item>

        <Form.Item
          label={t('mcp.key')}
          required
          validateStatus={keyError ? 'error' : undefined}
          help={
            keyError ? (
              <Text type="danger" style={{ fontSize: 12 }}>
                {keyError}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('mcp.keyHelp')}
              </Text>
            )
          }
        >
          <Input
            value={form.key}
            onChange={(e) => setField('key', e.target.value)}
            placeholder="my-server"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item label={t('mcp.type')}>
          <Radio.Group
            value={form.type}
            onChange={(e) => setField('type', e.target.value as McpServerType)}
          >
            <Radio value="stdio">{t('mcp.typeStdio')}</Radio>
            <Radio value="remote">{t('mcp.typeRemote')}</Radio>
          </Radio.Group>
        </Form.Item>

        {form.type === 'stdio' && (
          <>
            <Form.Item label={t('mcp.command')}>
              <Input
                value={form.command}
                onChange={(e) => setField('command', e.target.value)}
                placeholder="npx"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('mcp.args')}>
              <Input
                value={form.args}
                onChange={(e) => setField('args', e.target.value)}
                placeholder="-y, @scope/pkg, --flag"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('mcp.env')}>
              <KvList
                value={form.env}
                onChange={(v) => setField('env', v)}
                keyPlaceholder="ENV_VAR"
                valuePlaceholder="value"
                addLabel={t('common.add')}
              />
            </Form.Item>
            <Form.Item label={t('mcp.cwd')}>
              <Input
                value={form.cwd}
                onChange={(e) => setField('cwd', e.target.value)}
                placeholder="/path/to/dir"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </>
        )}

        {form.type === 'remote' && (
          <>
            <Form.Item label={t('mcp.url')}>
              <Input
                value={form.url}
                onChange={(e) => setField('url', e.target.value)}
                placeholder="https://example.com/mcp"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('mcp.headers')}>
              <KvList
                value={form.headers}
                onChange={(v) => setField('headers', v)}
                keyPlaceholder="Header-Name"
                valuePlaceholder="value"
                addLabel={t('common.add')}
              />
            </Form.Item>
            <Form.Item label={t('mcp.bearerTokenEnvVar')}>
              <Input
                value={form.bearerTokenEnvVar}
                onChange={(e) => setField('bearerTokenEnvVar', e.target.value)}
                placeholder="MY_TOKEN_ENV"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item label={t('mcp.oauth')}>
              <Switch
                checked={form.oauth}
                onChange={(v) => setField('oauth', v)}
              />
            </Form.Item>
          </>
        )}

        <Form.Item label={t('mcp.startupTimeout')}>
          <InputNumber
            value={form.startupTimeout}
            onChange={(v) => setField('startupTimeout', v)}
            min={0}
            style={{ width: 120 }}
          />
        </Form.Item>

        <Form.Item label={t('mcp.toolTimeout')}>
          <InputNumber
            value={form.toolTimeout}
            onChange={(v) => setField('toolTimeout', v)}
            min={0}
            style={{ width: 120 }}
          />
        </Form.Item>

        <Form.Item label={t('mcp.enabled')}>
          <Switch
            checked={form.enabled}
            onChange={(v) => setField('enabled', v)}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
