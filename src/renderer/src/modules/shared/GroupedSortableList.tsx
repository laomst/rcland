import type { HTMLAttributes, ReactNode } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'

interface GroupedSortableItem {
  id: string
  localOnly?: boolean
}

interface GroupedSortableListProps<T extends GroupedSortableItem> {
  titleSynced: string
  titleLocal: string
  items: T[]
  syncCollapsed: boolean
  localCollapsed: boolean
  onToggleSync: () => void
  onToggleLocal: () => void
  onAddSync: () => void
  onAddLocal: () => void
  onReorder: (activeId: string, overId: string) => void
  renderItem: (
    item: T,
    index: number,
    dragHandleProps: HTMLAttributes<HTMLDivElement> | undefined
  ) => ReactNode
}

export function GroupedSortableList<T extends GroupedSortableItem>({
  titleSynced,
  titleLocal,
  items,
  syncCollapsed,
  localCollapsed,
  onToggleSync,
  onToggleLocal,
  onAddSync,
  onAddLocal,
  onReorder,
  renderItem
}: GroupedSortableListProps<T>): React.ReactElement {
  const { sensors, handleDragEnd, syncItems, localItems } = useSortableList(items, onReorder)

  const renderSortableItems = (groupItems: T[], indexOffset: number) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groupItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {groupItems.map((item, index) => (
          <SortableWrapper key={item.id} id={item.id}>
            {(dragHandleProps) => renderItem(
              item,
              indexOffset + index + 1,
              dragHandleProps as HTMLAttributes<HTMLDivElement> | undefined
            )}
          </SortableWrapper>
        ))}
      </SortableContext>
    </DndContext>
  )

  return (
    <>
      <GroupHeader
        title={titleSynced}
        count={syncItems.length}
        collapsed={syncCollapsed}
        onToggle={onToggleSync}
        onAdd={onAddSync}
      />
      {!syncCollapsed && syncItems.length > 0 && renderSortableItems(syncItems, 0)}

      <GroupHeader
        title={titleLocal}
        count={localItems.length}
        collapsed={localCollapsed}
        onToggle={onToggleLocal}
        onAdd={onAddLocal}
        style={{ marginTop: 16 }}
      />
      {!localCollapsed && localItems.length > 0 && renderSortableItems(localItems, syncItems.length)}
    </>
  )
}
