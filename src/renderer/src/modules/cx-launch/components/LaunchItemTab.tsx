import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { LaunchItemCard } from './LaunchItemCard'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { SingleSortableList } from '@renderer/modules/shared/SingleSortableList'
import type { CXLaunchItem, CXProvider } from '@shared/types'

interface SortableLaunchItemCardProps {
  launchItem: CXLaunchItem
  providers: CXProvider[]
  index: number
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function SortableLaunchItemCard({ launchItem, providers, index, dragHandleProps }: SortableLaunchItemCardProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: launchItem.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LaunchItemCard
        launchItem={launchItem}
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
  const launchItems = useCXLandStore((s) => s.launchItems)
  const providers = useCXLandStore((s) => s.providers)
  const addLaunchItem = useCXLandStore((s) => s.addLaunchItem)
  const reorderLaunchItems = useCXLandStore((s) => s.reorderLaunchItems)
  const [addOpen, setAddOpen] = useState(false)
  const [filterMachineId, setFilterMachineId] = useState<string | null>(null)

  const firstProvider = providers[0]
  const firstEndpointId = firstProvider?.endpoints?.[0]?.id ?? ''
  const firstKeyId = firstProvider?.keys?.[0]?.id ?? ''

  const handleAdd = () => {
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
    passthroughCommand?: string
    useSystemProxy?: boolean
    applicableMachines?: string[]
    mcpMode?: 'inherit' | 'custom'
    mcpServerIds?: string[]
  }) => {
    addLaunchItem({
      id: crypto.randomUUID(),
      providerId: values.passthrough ? '' : values.providerId,
      endpointId: values.passthrough ? '' : values.endpointId,
      keyId: values.passthrough ? '' : values.keyId,
      name: values.name.trim(),
      funcName: values.funcName.trim(),
      enabled: true,
      model: values.passthrough ? undefined : (values.model?.trim() || undefined),
      passthrough: values.passthrough,
      passthroughCommand: values.passthrough ? (values.passthroughCommand?.trim() || undefined) : undefined,
      useSystemProxy: values.passthrough ? values.useSystemProxy : undefined,
      applicableMachines: values.applicableMachines,
      mcpMode: values.mcpMode,
      mcpServerIds: values.mcpServerIds
    })
    setAddOpen(false)
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
            launchItem={item}
            providers={providers}
            index={index}
            dragHandleProps={dh}
          />
        )}
      />

      <LaunchItemFormModal
        open={addOpen}
        title={t('cxLaunch.newLaunchItem')}
        providers={providers}
        initialValues={{
          providerId: firstProvider?.id ?? '',
          endpointId: firstEndpointId,
          keyId: firstKeyId,
          name: '',
          funcName: '',
          model: '',
          passthrough: false,
          passthroughCommand: '',
          useSystemProxy: false,
          applicableMachines: undefined
        }}
        okText={t('common.add')}
        onCancel={() => setAddOpen(false)}
        onOk={handleConfirmAdd}
      />
    </div>
  )
}
