import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCCLaunchStore, createEmptyLaunchItem } from '@renderer/stores/useCCLaunchStore'
import { LaunchItemCard } from './LaunchItemCard'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { GroupHeader } from '@renderer/components/GroupHeader'
import type { LaunchItem, Provider } from '@shared/types'

interface SortableLaunchItemCardProps {
  config: LaunchItem
  providers: Provider[]
  index: number
}

function SortableLaunchItemCard({ config, providers, index }: SortableLaunchItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: config.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LaunchItemCard
        config={config}
        providers={providers}
        index={index}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function LaunchItemTab(): React.ReactElement {
  const { t } = useTranslation()
  const launchItems = useCCLaunchStore((s) => s.launchItems)
  const providers = useCCLaunchStore((s) => s.providers)
  const addLaunchItem = useCCLaunchStore((s) => s.addLaunchItem)
  const reorderLaunchItems = useCCLaunchStore((s) => s.reorderLaunchItems)
  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addLocalOnly, setAddLocalOnly] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const firstProvider = providers[0]
  const firstEndpointId = firstProvider?.endpoints?.[0]?.id ?? ''
  const firstKeyId = firstProvider?.keys?.[0]?.id ?? ''
  const firstTemplateEnvVars = firstProvider?.template?.envVars ?? createEmptyLaunchItem(firstProvider?.id ?? '', '', '').envVars

  const handleAdd = (localOnly: boolean) => {
    setAddLocalOnly(localOnly)
    setAddOpen(true)
  }

  const handleConfirmAdd = (values: {
    providerId: string
    endpointId: string
    keyId: string
    name: string
    funcName: string
    envVars: typeof launchItems[number]['envVars']
    passthrough?: boolean
    useSystemProxy?: boolean
    localOnly?: boolean
  }) => {
    if (values.passthrough) {
      addLaunchItem({
        id: crypto.randomUUID(),
        providerId: '',
        endpointId: '',
        keyId: '',
        name: values.name.trim(),
        funcName: values.funcName.trim(),
        enabled: true,
        envVars: {},
        passthrough: true,
        useSystemProxy: values.useSystemProxy,
        localOnly: values.localOnly
      })
    } else {
      const launchItem = createEmptyLaunchItem(values.providerId, values.endpointId, values.keyId)
      addLaunchItem({
        ...launchItem,
        name: values.name.trim(),
        funcName: values.funcName.trim(),
        envVars: values.envVars,
        localOnly: values.localOnly
      })
    }
    setAddOpen(false)
  }

  const handleAddKey = () => {
    // User needs to go to provider tab first to add keys
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderLaunchItems(active.id as string, over.id as string)
    }
  }

  // Split into synced and local groups
  const syncedLaunchItems = launchItems.filter((c) => !c.localOnly)
  const localLaunchItems = launchItems.filter((c) => c.localOnly)

  return (
    <div>
      {/* 同步启动项 */}
      <GroupHeader title={t('common.syncedConfig')} count={syncedLaunchItems.length} collapsed={syncCollapsed} onToggle={() => setSyncCollapsed(!syncCollapsed)} onAdd={() => handleAdd(false)} />
      {!syncCollapsed && syncedLaunchItems.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={syncedLaunchItems.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {syncedLaunchItems.map((c, idx) => (
              <SortableLaunchItemCard key={c.id} config={c} providers={providers} index={idx + 1} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* 本机启动项 */}
      <GroupHeader title={t('common.localConfig')} count={localLaunchItems.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localLaunchItems.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localLaunchItems.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {localLaunchItems.map((c, idx) => (
              <SortableLaunchItemCard key={c.id} config={c} providers={providers} index={syncedLaunchItems.length + idx + 1} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <LaunchItemFormModal
        open={addOpen}
        title={t('ccLaunch.newLaunchItem')}
        providers={providers}
        initialValues={{
          providerId: firstProvider?.id ?? '',
          endpointId: firstEndpointId,
          keyId: firstKeyId,
          name: '',
          funcName: '',
          envVars: firstTemplateEnvVars,
          passthrough: false,
          useSystemProxy: false,
          localOnly: addLocalOnly
        }}
        okText={t('common.add')}
        onCancel={() => setAddOpen(false)}
        onOk={handleConfirmAdd}
        onAddKey={handleAddKey}
      />
    </div>
  )
}
