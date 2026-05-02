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
import { useCCLaunchStore, createEmptyConfig } from '@renderer/stores/useCCLaunchStore'
import { ConfigCard } from './ConfigCard'
import { ConfigFormModal } from './ConfigFormModal'
import { GroupHeader } from '@renderer/components/GroupHeader'
import type { ConfigSet, Provider } from '@shared/types'

interface SortableConfigCardProps {
  config: ConfigSet
  providers: Provider[]
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
  const configs = useCCLaunchStore((s) => s.configs)
  const providers = useCCLaunchStore((s) => s.providers)
  const addConfig = useCCLaunchStore((s) => s.addConfig)
  const reorderConfigs = useCCLaunchStore((s) => s.reorderConfigs)
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
  const firstTemplateEnvVars = firstProvider?.template?.envVars ?? createEmptyConfig(firstProvider?.id ?? '', '', '').envVars

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
    envVars: typeof configs[number]['envVars']
    passthrough?: boolean
    useSystemProxy?: boolean
    localOnly?: boolean
  }) => {
    if (values.passthrough) {
      addConfig({
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
      const config = createEmptyConfig(values.providerId, values.endpointId, values.keyId)
      addConfig({
        ...config,
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
      reorderConfigs(active.id as string, over.id as string)
    }
  }

  // Split into synced and local groups
  const syncedConfigs = configs.filter((c) => !c.localOnly)
  const localConfigs = configs.filter((c) => c.localOnly)

  return (
    <div>
      {/* 同步配置 */}
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

      {/* 本机配置 */}
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
        title={t('ccLaunch.newConfig')}
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
