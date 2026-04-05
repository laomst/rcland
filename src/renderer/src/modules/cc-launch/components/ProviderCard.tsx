import { useState } from 'react'
import { Space, Switch, Typography, Button, Tooltip, App, message } from 'antd'
import { EditOutlined, DeleteOutlined, LockOutlined, CopyOutlined } from '@ant-design/icons'
import type { Provider } from '@shared/types'
import { useAppStore } from '@renderer/stores/useAppStore'
import { ProviderFormModal, withDefaults } from './ProviderFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

const { Text } = Typography

export function ProviderCard({
  provider,
  index,
  isDragging,
  dragHandleProps
}: {
  provider: Provider
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { modal } = App.useApp()
  const updateProvider = useAppStore((s) => s.updateProvider)
  const addProviderAfter = useAppStore((s) => s.addProviderAfter)
  const configs = useAppStore((s) => s.configs)
  const [editOpen, setEditOpen] = useState(false)

  const accent = provider.color || '#1677ff'
  const relatedConfigs = configs.filter((c) => c.providerId === provider.id)
  const keyCount = provider.keys?.length ?? 0

  const handleCopy = () => {
    const { id, ...rest } = provider
    const newProvider = {
      ...rest,
      id: crypto.randomUUID(),
      name: provider.name + ' (副本)'
    }
    addProviderAfter(provider.id, newProvider)
    message.success('已复制供应商')
  }

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={provider.enabled}
        borderColor={provider.enabled ? accent : '#d9d9d9'}
        background={provider.enabled ? '#fff' : '#f5f5f5'}
        dragHandleProps={dragHandleProps}
        actions={<>
          {/* Endpoints */}
          <Space size={2}>
            {(provider.endpoints ?? []).map((ep, i) => (
              <Text key={ep.id} type="secondary" style={{ fontSize: 11, lineHeight: '20px' }}>
                {i > 0 ? ' / ' : ''}{ep.label || ep.url}
              </Text>
            ))}
          </Space>

          {/* Key count */}
          {keyCount > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <LockOutlined style={{ marginRight: 2 }} />
              {keyCount} 个密钥
            </Text>
          )}

          <Text type="secondary" style={{ fontSize: 12 }}>({relatedConfigs.length} 个配置)</Text>
          <Tooltip title="复制">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopy} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
              const count = relatedConfigs.length
              modal.confirm({
                title: '确认删除',
                content: count > 0
                  ? `供应商 "${provider.name}" 下有 ${count} 个配置，删除后关联配置也将被移除，确定？`
                  : `确定删除供应商 "${provider.name}" 吗？`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => useAppStore.getState().removeProvider(provider.id)
              })
            }} />
          </Tooltip>
          <Switch
            size="small"
            checked={provider.enabled}
            onChange={(checked) => updateProvider(provider.id, { enabled: checked })}
          />
        </>}
      >
        {/* Color dot */}
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: provider.enabled ? accent : '#d9d9d9',
          display: 'inline-block', flexShrink: 0
        }} />

        {/* Name */}
        <Text strong style={{ fontSize: 14 }}>{provider.name}</Text>

        {!provider.enabled && <Text type="secondary" style={{ fontSize: 12 }}>(已停用)</Text>}
      </ItemRow>

      <ProviderFormModal
        open={editOpen}
        title={`编辑供应商: ${provider.name}`}
        initialValues={{
          id: provider.id,
          name: provider.name,
          endpoints: (provider.endpoints ?? []).map((ep) => ({ ...ep })),
          keys: (provider.keys ?? []).map((k) => ({ ...k })),
          color: accent,
          template: { envVars: withDefaults(provider.template?.envVars) }
        }}
        existingConfigs={configs}
        onCancel={() => setEditOpen(false)}
        onOk={(values) => {
          updateProvider(provider.id, values)
          setEditOpen(false)
        }}
      />
    </>
  )
}
