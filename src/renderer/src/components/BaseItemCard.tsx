import { useState, type ReactNode } from 'react'
import { Button, Switch, Tooltip, App, Select } from 'antd'
 import { EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons'
import { ItemRow } from './ItemRow'

interface BaseItemCardProps<T extends { id: string; enabled?: boolean; localOnly?: boolean; order?: number }> {
  item: T
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  deleteConfirmContent: string
  onUpdate: (id: string, patch: Partial<T>) => void
  onRemove: (id: string) => void
  onDuplicate?: (item: T) => void
  getAllItems: () => T[]
  renderContent: (item: T) => ReactNode
  renderEditModal: (open: boolean, onClose: () => void) => ReactNode
}

export function BaseItemCard<T extends { id: string; enabled?: boolean; localOnly?: boolean; order?: number }>({
  item,
  index,
  isDragging,
  dragHandleProps,
  deleteConfirmContent,
  onUpdate,
  onRemove,
  onDuplicate,
  getAllItems,
  renderContent,
  renderEditModal
}: BaseItemCardProps<T>): React.ReactElement {
  const { modal } = App.useApp()
  const [editOpen, setEditOpen] = useState(false)

  const handleDelete = (): void => {
    modal.confirm({
      title: '确认删除',
      content: deleteConfirmContent,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => onRemove(item.id)
    })
  }

  const handleLocalOnlyChange = (val: string): void => {
    const newLocalOnly = val === 'local'
    const allItems = getAllItems()
    const targetGroup = allItems.filter((i) => !!i.localOnly === newLocalOnly)
    const maxOrder = targetGroup.length > 0 ? Math.max(...targetGroup.map((i) => i.order ?? 0)) + 1 : 0
    onUpdate(item.id, { localOnly: newLocalOnly, order: maxOrder } as Partial<T>)
  }

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={item.enabled}
        dragHandleProps={dragHandleProps}
        actions={<>
          {onDuplicate && (
            <Tooltip title="复制">
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => onDuplicate(item)} />
            </Tooltip>
          )}
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={handleDelete} />
          </Tooltip>
          <Select
            size="small"
            variant="borderless"
            value={item.localOnly ? 'local' : 'sync'}
            onChange={handleLocalOnlyChange}
            style={{ width: 70 }}
            options={[
              { value: 'sync', label: '同步' },
              { value: 'local', label: '本机' }
            ]}
          />
          <Switch
            size="small"
            checked={item.enabled}
            onChange={(checked) => onUpdate(item.id, { enabled: checked } as Partial<T>)}
          />
        </>}
      >
        {renderContent(item)}
      </ItemRow>

      {renderEditModal(editOpen, () => setEditOpen(false))}
    </>
  )
}
