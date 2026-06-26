import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCCLaunchStore, createEmptyLaunchItem } from '@renderer/stores/useCCLaunchStore'
import { LaunchItemCard } from './LaunchItemCard'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { SingleSortableList } from '@renderer/modules/shared/SingleSortableList'
import type { LaunchItem, Provider } from '@shared/types'
import { stripCommonValues } from '@shared/types/cc-launch'

interface SortableLaunchItemCardProps {
  config: LaunchItem
  providers: Provider[]
  index: number
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function SortableLaunchItemCard({ config, providers, index, dragHandleProps }: SortableLaunchItemCardProps) {
  const {
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
        dragHandleProps={dragHandleProps}
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
  const [addOpen, setAddOpen] = useState(false)
  const [filterMachineId, setFilterMachineId] = useState<string | null>(null)

  const firstProvider = providers[0]
  const firstEndpointId = firstProvider?.endpoints?.[0]?.id ?? ''
  const firstKeyId = firstProvider?.keys?.[0]?.id ?? ''
  const firstTemplateEnvVars = stripCommonValues(firstProvider?.template?.envVars ?? createEmptyLaunchItem(firstProvider?.id ?? '', '', '').envVars)

  const handleAdd = () => {
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
    passthroughCommand?: string
    useSystemProxy?: boolean
    applicableMachines?: string[]
    mcpMode?: 'inherit' | 'custom'
    mcpServerIds?: string[]
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
        envVars: values.envVars,
        passthrough: true,
        passthroughCommand: values.passthroughCommand?.trim() || undefined,
        useSystemProxy: values.useSystemProxy,
        applicableMachines: values.applicableMachines,
        mcpMode: values.mcpMode,
        mcpServerIds: values.mcpServerIds
      })
    } else {
      const launchItem = createEmptyLaunchItem(values.providerId, values.endpointId, values.keyId)
      addLaunchItem({
        ...launchItem,
        name: values.name.trim(),
        funcName: values.funcName.trim(),
        envVars: values.envVars,
        applicableMachines: values.applicableMachines,
        mcpMode: values.mcpMode,
        mcpServerIds: values.mcpServerIds
      })
    }
    setAddOpen(false)
  }

  const handleAddKey = () => {
    // User needs to go to provider tab first to add keys
  }

  return (
    <div>
      <SingleSortableList
        items={launchItems}
        onReorder={reorderLaunchItems}
        onAdd={handleAdd}
        filterMachineId={filterMachineId}
        onFilterChange={setFilterMachineId}
        renderItem={(item, index, dh) => (
          <SortableLaunchItemCard
            config={item}
            providers={providers}
            index={index}
            dragHandleProps={dh}
          />
        )}
      />

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
          passthroughCommand: '',
          useSystemProxy: false,
          applicableMachines: undefined
        }}
        okText={t('common.add')}
        onCancel={() => setAddOpen(false)}
        onOk={handleConfirmAdd}
        onAddKey={handleAddKey}
      />
    </div>
  )
}
