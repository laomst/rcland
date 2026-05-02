import type { HTMLAttributes, ReactNode } from 'react'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { SortableWrapper } from '@renderer/components/SortableWrapper'

interface SortableItem {
  id: string
}

interface SortableListProps<T extends SortableItem> {
  title: string
  items: T[]
  onAdd: () => void
  onReorder: (activeId: string, overId: string) => void
  renderItem: (
    item: T,
    index: number,
    dragHandleProps: HTMLAttributes<HTMLDivElement> | undefined
  ) => ReactNode
}

export function SortableList<T extends SortableItem>({
  title,
  items,
  onAdd,
  onReorder,
  renderItem
}: SortableListProps<T>): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string)
    }
  }

  return (
    <>
      <GroupHeader title={title} count={items.length} onAdd={onAdd} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableWrapper key={item.id} id={item.id}>
              {(dragHandleProps) => renderItem(
                item,
                index + 1,
                dragHandleProps as HTMLAttributes<HTMLDivElement> | undefined
              )}
            </SortableWrapper>
          ))}
        </SortableContext>
      </DndContext>
    </>
  )
}
