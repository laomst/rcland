import { Space, Tag, Tooltip, Typography } from 'antd'
import type { ShellAlias } from '@shared/shell-types'
import type { ShellType } from '@shared/shell'
import { SHELL_LABELS } from '@shared/shell'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { AliasFormModal } from './AliasFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'

const { Text } = Typography

export function AliasCard({
  alias,
  index,
  isDragging,
  dragHandleProps
}: {
  alias: ShellAlias
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const updateAlias = useShellConfigStore((s) => s.updateAlias)

  return (
    <BaseItemCard
      item={alias}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      deleteConfirmContent={`确定删除别名 "${alias.alias}" 吗？`}
      onUpdate={updateAlias}
      onRemove={(id) => useShellConfigStore.getState().removeAlias(id)}
      getAllItems={() => useShellConfigStore.getState().shellConfig.aliases}
      renderContent={(item) => {
        const displayCommand = item.command.length > 40
          ? item.command.slice(0, 40) + '...'
          : item.command
        return (
          <>
            {/* Alias Name */}
            <Tooltip title={item.alias}>
              <Text strong style={{ fontSize: 12, minWidth: 80, flexShrink: 0, fontFamily: 'monospace' }}>
                {item.alias || '(未设置)'}
              </Text>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>→</Text>

            {/* Command */}
            <Tooltip title={item.command}>
              <Text style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {displayCommand || '(空)'}
              </Text>
            </Tooltip>

            {/* Description */}
            {item.description && (
              <Tooltip title={item.description}>
                <Text type="secondary" style={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </Text>
              </Tooltip>
            )}

            {/* Shell Tags */}
            {item.shells && item.shells.length > 0 && (
              <Space size={2} style={{ flexShrink: 0 }}>
                {item.shells.map((shell: ShellType) => (
                  <Tag key={shell} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                    {SHELL_LABELS[shell]}
                  </Tag>
                ))}
              </Space>
            )}
          </>
        )
      }}
      renderEditModal={(open, onClose) => (
        <AliasFormModal
          open={open}
          title={`编辑: ${alias.alias}`}
          isEdit
          initialValues={{
            alias: alias.alias,
            command: alias.command,
            description: alias.description ?? '',
            shells: alias.shells ?? [],
            localOnly: alias.localOnly ?? false
          }}
          okText="保存"
          onCancel={onClose}
          onOk={(values) => {
            updateAlias(alias.id, {
              alias: values.alias,
              command: values.command,
              description: values.description,
              shells: values.shells,
              localOnly: values.localOnly
            })
            onClose()
          }}
        />
      )}
    />
  )
}
