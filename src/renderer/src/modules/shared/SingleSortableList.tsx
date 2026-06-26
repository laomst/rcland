import type { HTMLAttributes, ReactNode } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Select, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'
import { useMachinesStore } from '@renderer/stores/useMachinesStore'
import { appliesToMachine } from '@shared/machine-filter'

interface Item { id: string; applicableMachines?: string[] }

interface Props<T extends Item> {
  items: T[]
  onReorder: (activeId: string, overId: string) => void
  onAdd: () => void
  filterMachineId: string | null  // null = 全部
  onFilterChange: (id: string | null) => void
  renderItem: (item: T, index: number, dragHandleProps: HTMLAttributes<HTMLDivElement> | undefined) => ReactNode
}

export function SingleSortableList<T extends Item>({
  items, onReorder, onAdd, filterMachineId, onFilterChange, renderItem
}: Props<T>): React.ReactElement {
  const { t } = useTranslation()
  const { sensors, handleDragEnd } = useSortableList(items, onReorder)
  const machines = useMachinesStore((s) => s.machines)
  const currentId = useMachinesStore((s) => s.currentMachineId)

  const visible = filterMachineId === null ? items : items.filter((it) => appliesToMachine(it, filterMachineId))

  return (
    <>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Select
          size="small"
          style={{ width: 200 }}
          value={filterMachineId ?? '__all__'}
          onChange={(v) => onFilterChange(v === '__all__' ? null : v)}
          options={[
            { value: '__all__', label: t('common.filterAll') },
            ...machines.map((m) => ({
              value: m.id,
              label: m.id === currentId ? `${m.name} (${t('common.currentMachine')})` : m.name
            }))
          ]}
        />
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>{t('common.add')}</Button>
      </Space>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {visible.map((item, index) => (
            <SortableWrapper key={item.id} id={item.id}>
              {(dh) => renderItem(item, index + 1, dh as HTMLAttributes<HTMLDivElement> | undefined)}
            </SortableWrapper>
          ))}
        </SortableContext>
      </DndContext>
    </>
  )
}
