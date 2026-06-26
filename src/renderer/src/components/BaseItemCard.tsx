import { useState, type ReactNode } from 'react'
import { Button, Switch, Tooltip, App } from 'antd'
import { EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons'
import { ItemRow } from './ItemRow'
import { MachineScopeTag } from './MachineScopeTag'
import { appliesToMachine } from '@shared/machine-filter'
import { useMachinesStore } from '@renderer/stores/useMachinesStore'
import { useTranslation } from 'react-i18next'

interface BaseItemCardProps<T extends { id: string; enabled?: boolean; applicableMachines?: string[] }> {
  item: T
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  deleteConfirmContent: string
  hideSyncToggle?: boolean
  onUpdate: (id: string, patch: Partial<T>) => void
  onRemove: (id: string) => void
  onDuplicate?: (item: T) => void
  getAllItems: () => T[]
  renderContent: (item: T) => ReactNode
  renderEditModal: (open: boolean, onClose: () => void) => ReactNode
}

export function BaseItemCard<T extends { id: string; enabled?: boolean; applicableMachines?: string[] }>({
  item,
  index,
  isDragging,
  dragHandleProps,
  deleteConfirmContent,
  hideSyncToggle,
  onUpdate,
  onRemove,
  onDuplicate,
  getAllItems,
  renderContent,
  renderEditModal
}: BaseItemCardProps<T>): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const [editOpen, setEditOpen] = useState(false)
  const currentId = useMachinesStore((s) => s.currentMachineId)
  const dimmed = !!currentId && !appliesToMachine(item, currentId)

  const handleDelete = (): void => {
    modal.confirm({
      title: t('common.confirmDelete'),
      content: deleteConfirmContent,
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onRemove(item.id)
    })
  }

  return (
    <>
      <div style={dimmed ? { opacity: 0.5 } : undefined}>
        <ItemRow
          index={index}
          isDragging={isDragging}
          enabled={item.enabled}
          dragHandleProps={dragHandleProps}
          actions={<>
            {onDuplicate && (
              <Tooltip title={t('common.copy')}>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => onDuplicate(item)} />
              </Tooltip>
            )}
            <Tooltip title={t('common.edit')}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={handleDelete} />
            </Tooltip>
            {!hideSyncToggle && <MachineScopeTag applicableMachines={item.applicableMachines} />}
            <Switch
              size="small"
              checked={item.enabled}
              onChange={(checked) => onUpdate(item.id, { enabled: checked } as Partial<T>)}
            />
          </>}
        >
          {renderContent(item)}
        </ItemRow>
      </div>

      {renderEditModal(editOpen, () => setEditOpen(false))}
    </>
  )
}
