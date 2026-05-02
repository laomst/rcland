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
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { ConfigCard } from './ConfigCard'
import { ConfigFormModal } from './ConfigFormModal'
import { GroupHeader } from '@renderer/components/GroupHeader'
import type { CXConfigSet, CXProvider } from '@shared/types'

interface SortableConfigCardProps {
  config: CXConfigSet
  providers: CXProvider[]
  index: number
}

function SortableConfigCard({ config, providers, index }: SortableConfigCardProps) {
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
      <ConfigCard
        config={config}
        providers={providers}
        index={index}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function ConfigTab(): React.ReactElement {
  const { t } = useTranslation()
  const configs = useCXLandStore((s) => s.data.configs)
  const providers = useCXLandStore((s) => s.data.providers)
  const addCXConfig = useCXLandStore((s) => s.addCXConfig)
  const reorderCXConfigs = useCXLandStore((s) => s.reorderCXConfigs)
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
    model?: string
    passthrough?: boolean
    useSystemProxy?: boolean
    localOnly?: boolean
  }) => {
    addCXConfig({
      id: crypto.randomUUID(),
      providerId: values.passthrough ? '' : values.providerId,
      endpointId: values.passthrough ? '' : values.endpointId,
      keyId: values.passthrough ? '' : values.keyId,
      name: values.name.trim(),
      funcName: values.funcName.trim(),
      enabled: true,
      model: values.passthrough ? undefined : (values.model?.trim() || undefined),
      passthrough: values.passthrough,
      useSystemProxy: values.passthrough ? values.useSystemProxy : undefined,
      localOnly: values.localOnly
    })
    setAddOpen(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderCXConfigs(active.id as string, over.id as string)
    }
  }

  // Split into synced and local groups
  const syncedConfigs = configs.filter((c) => !c.localOnly)
  const localConfigs = configs.filter((c) => c.localOnly)

  return (
    <div>
      {/* Synced configs */}
      <GroupHeader title={t('common.syncedConfig')} count={syncedConfigs.length} collapsed={syncCollapsed} onToggle={() => setSyncCollapsed(!syncCollapsed)} onAdd={() => handleAdd(false)} />
      {!syncCollapsed && syncedConfigs.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={syncedConfigs.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {syncedConfigs.map((c, idx) => (
              <SortableConfigCard key={c.id} config={c} providers={providers} index={idx + 1} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Local configs */}
      <GroupHeader title={t('common.localConfig')} count={localConfigs.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localConfigs.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localConfigs.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {localConfigs.map((c, idx) => (
              <SortableConfigCard key={c.id} config={c} providers={providers} index={syncedConfigs.length + idx + 1} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <ConfigFormModal
        open={addOpen}
        title={t('cxLaunch.newConfig')}
        providers={providers}
        initialValues={{
          providerId: firstProvider?.id ?? '',
          endpointId: firstEndpointId,
          keyId: firstKeyId,
          name: '',
          funcName: '',
          model: '',
          passthrough: false,
          useSystemProxy: false,
          localOnly: addLocalOnly
        }}
        okText={t('common.add')}
        onCancel={() => setAddOpen(false)}
        onOk={handleConfirmAdd}
      />
    </div>
  )
}
