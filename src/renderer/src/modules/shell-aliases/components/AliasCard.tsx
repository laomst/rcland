import { Space, Tag, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const updateAlias = useShellConfigStore((s) => s.updateAlias)

  return (
    <BaseItemCard
      item={alias}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      deleteConfirmContent={t('shellAliases.deleteConfirm', { name: alias.alias })}
      onUpdate={updateAlias}
      onRemove={(id) => useShellConfigStore.getState().removeAlias(id)}
      onDuplicate={(alias) => {
        useShellConfigStore.getState().addAliasAfter(alias.id, {
          ...alias,
          id: crypto.randomUUID(),
          alias: alias.alias + '-copy'
        })
      }}
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
                {item.alias || t('common.notSet')}
              </Text>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>→</Text>

            {/* Command */}
            <Tooltip title={item.command}>
              <Text style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {displayCommand || t('common.empty')}
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
          title={t('shellAliases.editItemTitle', { name: alias.alias })}
          isEdit
          initialValues={{
            alias: alias.alias,
            command: alias.command,
            description: alias.description ?? '',
            shells: alias.shells ?? [],
            localOnly: alias.localOnly ?? false
          }}
          okText={t('common.save')}
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
