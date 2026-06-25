import { useState } from 'react'
import { Card, Tag, Typography, Switch, Button, Popconfirm, Space, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { McpServer } from '@shared/types'
import { useMcpServersStore } from '@renderer/stores/useMcpServersStore'
import { McpServerEditModal } from './McpServerEditModal'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'

const { Text } = Typography

interface McpServerCardProps {
  server: McpServer
  dragHandleProps?: SyntheticListenerMap
}

export function McpServerCard({ server, dragHandleProps }: McpServerCardProps): React.ReactElement {
  const { t } = useTranslation()
  const updateServer = useMcpServersStore((s) => s.updateServer)
  const removeServer = useMcpServersStore((s) => s.removeServer)
  const [editOpen, setEditOpen] = useState(false)

  const summary =
    server.type === 'stdio'
      ? [server.command, ...(server.args ?? [])].filter(Boolean).join(' ')
      : server.url ?? ''

  return (
    <>
      <Card
        size="small"
        style={{ marginBottom: 8, opacity: server.enabled ? 1 : 0.6 }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            style={{ cursor: 'grab', color: '#bbb', fontSize: 14, flexShrink: 0 }}
          >
            <HolderOutlined />
          </div>

          {/* Type tag */}
          <Tag
            color={server.type === 'stdio' ? 'blue' : 'green'}
            style={{ flexShrink: 0, fontSize: 11 }}
          >
            {server.type}
          </Tag>

          {/* Name */}
          <Text strong style={{ flexShrink: 0, fontSize: 13 }}>
            {server.name}
          </Text>

          {/* Key */}
          <Text
            type="secondary"
            style={{ fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}
          >
            [{server.key}]
          </Text>

          {/* Summary */}
          {summary && (
            <Tooltip title={summary}>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {summary}
              </Text>
            </Tooltip>
          )}

          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <Space size={4}>
              <Switch
                size="small"
                checked={server.enabled}
                onChange={(checked) => updateServer(server.id, { enabled: checked })}
              />
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              />
              <Popconfirm
                title={t('mcp.deleteConfirm', { name: server.name })}
                onConfirm={() => removeServer(server.id)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </div>
        </div>
      </Card>

      <McpServerEditModal
        open={editOpen}
        server={server}
        onOk={(updated) => {
          updateServer(server.id, updated)
          setEditOpen(false)
        }}
        onCancel={() => setEditOpen(false)}
      />
    </>
  )
}
