import { Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { FolderOutlined } from '@ant-design/icons'
import type { PathEntry } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { PathFormModal } from './PathFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'

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
        const displayPath = item.path.length > 50
          ? item.path.slice(0, 50) + '...'
          : item.path
        return (
          <>
            {/* Folder Icon */}
            <FolderOutlined style={{ fontSize: 14, color: '#999', flexShrink: 0 }} />

            {/* Path */}
            <Tooltip title={item.path}>
              <Text style={{ fontSize: 12, flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayPath || t('common.notSet')}
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
            shells: pathEntry.shells ?? [],
            localOnly: pathEntry.localOnly ?? false
          }}
          okText={t('common.save')}
          onCancel={onClose}
          onOk={(values) => {
            updatePathEntry(pathEntry.id, {
              path: values.path,
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
