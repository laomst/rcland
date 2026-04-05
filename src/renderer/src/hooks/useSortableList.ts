import { useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMemo } from 'react'

interface SortableItem {
  id: string
  localOnly?: boolean
}

export function useSortableList<T extends SortableItem>(
  items: T[],
  reorderFn: (activeId: string, overId: string) => void
) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderFn(active.id as string, over.id as string)
    }
  }

  const syncItems = useMemo(() => items.filter((item) => !item.localOnly), [items])
  const localItems = useMemo(() => items.filter((item) => item.localOnly), [items])

  return { sensors, handleDragEnd, syncItems, localItems }
}
