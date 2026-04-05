import { useState } from 'react'
import { Button, Space, Switch, Typography, Tooltip, App, Select } from 'antd'
import { EditOutlined, DeleteOutlined, WarningOutlined, CopyOutlined, LockOutlined } from '@ant-design/icons'
import type { ConfigSet, Provider } from '@shared/types'
import { useAppStore } from '@renderer/stores/useAppStore'
import { ConfigFormModal } from './ConfigFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

const { Text } = Typography

/** Flexible column style with ellipsis */
const flexCol = (flex: number): React.CSSProperties => ({
  flex,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export function ConfigCard({
  config,
  providers,
  index,
  isDragging,
  dragHandleProps
}: {
  config: ConfigSet
  providers: Provider[]
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { modal } = App.useApp()
  const updateConfig = useAppStore((s) => s.updateConfig)
  const [editOpen, setEditOpen] = useState(false)

  const provider = providers.find((p) => p.id === config.providerId)
  const accent = provider?.color || '#1677ff'
  const providerDisabled = !provider?.enabled

  const key = provider?.keys.find((k) => k.id === config.keyId)
  const keyMissing = !key && config.keyId

  const configName = config.name || config.funcName

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={config.enabled}
        borderColor={providerDisabled ? '#faad14' : accent}
        background={!config.enabled ? '#f0f0f0' : providerDisabled ? '#fff7e6' : '#f6f8fa'}
        dragHandleProps={dragHandleProps}
        actions={<>
          {/* Endpoint Selector */}
          <Select
            size="small"
            variant="borderless"
            value={config.endpointId}
            onChange={(val) => updateConfig(config.id, { endpointId: val })}
            style={{ width: 140, textAlign: 'right' }}
            popupMatchSelectWidth={false}
            placeholder="选择接入点"
            options={(provider?.endpoints ?? []).map((ep) => ({
              value: ep.id,
              label: <span style={{ fontSize: 12 }}>{ep.label || ep.url}</span>
            }))}
          />

          {/* Key Selector */}
          <Select
            size="small"
            variant="borderless"
            value={config.keyId}
            onChange={(val) => updateConfig(config.id, { keyId: val })}
            style={{ width: 90, textAlign: 'right' }}
            popupMatchSelectWidth={false}
            placeholder="选择密钥"
            status={keyMissing ? 'error' : undefined}
            suffixIcon={<LockOutlined style={{ fontSize: 10, color: keyMissing ? '#ff4d4f' : '#999' }} />}
            options={(provider?.keys ?? []).map((k) => ({
              value: k.id,
              label: <span style={{ fontSize: 12 }}>{k.label}</span>
            }))}
          />

          {/* Warning */}
          {providerDisabled && (
            <Text type="warning" style={{ fontSize: 12 }}><WarningOutlined /> 供应商已停用</Text>
          )}

          {/* Action Buttons */}
          <Tooltip title="复制">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => {
              const { id, ...rest } = config
              useAppStore.getState().addConfigAfter(config.id, {
                ...rest,
                id: crypto.randomUUID(),
                funcName: config.funcName + '-copy'
              })
            }} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
              modal.confirm({
                title: '确认删除',
                content: `确定删除配置 "${config.funcName}" 吗？`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => useAppStore.getState().removeConfig(config.id)
              })
            }} />
          </Tooltip>
          <Select
            size="small"
            variant="borderless"
            value={config.localOnly ? 'local' : 'sync'}
            onChange={(val) => updateConfig(config.id, { localOnly: val === 'local' })}
            style={{ width: 70 }}
            options={[
              { value: 'sync', label: '同步' },
              { value: 'local', label: '本机' }
            ]}
          />
          <Switch
            size="small"
            checked={config.enabled}
            onChange={(checked) => updateConfig(config.id, { enabled: checked })}
          />
        </>}
      >
        {/* 1. Provider - fixed */}
        <Tooltip title={provider?.name ?? '未知'}>
          <Space size={4} style={{ width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }} />
            <Text style={{ fontSize: 12 }}>{provider?.name ?? '未知'}</Text>
          </Space>
        </Tooltip>

        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>|</Text>

        {/* 2. Config Name + Function Name - flexible */}
        <Tooltip title={`${configName} (${config.funcName})`}>
          <div style={{ ...flexCol(1), display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{configName}</Text>
            <Text code style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>({config.funcName})</Text>
          </div>
        </Tooltip>
      </ItemRow>

      <ConfigFormModal
        open={editOpen}
        title={`编辑: ${configName}`}
        providers={providers}
        isEdit
        initialValues={{
          providerId: config.providerId,
          endpointId: config.endpointId,
          keyId: config.keyId,
          name: config.name || '',
          funcName: config.funcName,
          envVars: { ...config.envVars },
          localOnly: config.localOnly ?? false
        }}
        okText="保存"
        onCancel={() => setEditOpen(false)}
        onOk={(values) => {
          updateConfig(config.id, {
            endpointId: values.endpointId,
            keyId: values.keyId,
            name: values.name,
            funcName: values.funcName,
            envVars: values.envVars
          })
          setEditOpen(false)
        }}
      />
    </>
  )
}
