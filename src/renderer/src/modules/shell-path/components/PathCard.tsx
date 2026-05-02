import { Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { FolderOutlined } from '@ant-design/icons'
import type { PathEntry } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { PathFormModal } from './PathFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'
import { VariableRefDisplay } from '@renderer/components/VariableRefDisplay'

const { Text } = Typography

export function PathCard({
  pathEntry,
  index,
  isDragging,
  dragHandleProps
}: {
  pathEntry: PathEntry
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const updatePathEntry = useShellConfigStore((s) => s.updatePathEntry)

  return (
    <BaseItemCard
      item={pathEntry}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      hideSyncToggle
      deleteConfirmContent={t('shellPath.deleteConfirm', { path: pathEntry.path })}
      onUpdate={updatePathEntry}
      onRemove={(id) => useShellConfigStore.getState().removePathEntry(id)}
      onDuplicate={(pathEntry) => {
        useShellConfigStore.getState().addPathEntryAfter(pathEntry.id, {
          ...pathEntry,
          id: crypto.randomUUID()
        })
      }}
      getAllItems={() => useShellConfigStore.getState().shellConfig.pathEntries}
      renderContent={(item) => {
        return (
          <>
            <FolderOutlined style={{ fontSize: 14, color: '#999', flexShrink: 0 }} />

            <Tooltip title={item.path}>
              <VariableRefDisplay text={item.path || t('common.notSet')} maxLength={50} style={{ flex: 1, fontSize: 12, fontFamily: 'monospace' }} />
            </Tooltip>

            {item.description && (
              <Tooltip title={item.description}>
                <Text type="secondary" style={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </Text>
              </Tooltip>
            )}
          </>
        )
      }}
      renderEditModal={(open, onClose) => (
        <PathFormModal
          open={open}
          title={t('shellPath.editTitle', { path: pathEntry.path })}
          isEdit
          initialValues={{
            path: pathEntry.path,
            description: pathEntry.description ?? '',
            shells: pathEntry.shells ?? []
          }}
          okText={t('common.save')}
          onCancel={onClose}
          onOk={(values) => {
            updatePathEntry(pathEntry.id, {
              path: values.path,
              description: values.description,
              shells: values.shells
            })
            onClose()
          }}
        />
      )}
    />
  )
}
