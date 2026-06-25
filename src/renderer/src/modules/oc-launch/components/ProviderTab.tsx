import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Empty, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
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
import type { McpServer, OCEndpoint, OCModel, OCProvider, OCProviderKey, OCSdkType } from '@shared/types'
import { useOCLandStore } from '@renderer/stores/useOCLandStore'
import { ProviderCard } from './ProviderCard'
import { ProviderFormModal } from './ProviderFormModal'

const { Text } = Typography

interface SortableProviderCardProps {
  provider: OCProvider
  index: number
}

function SortableProviderCard({ provider, index }: SortableProviderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: provider.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ProviderCard
        provider={provider}
        index={index}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function ProviderTab(): React.ReactElement {
  const { t } = useTranslation()
  const providers = useOCLandStore((s) => s.providers)
  const addProvider = useOCLandStore((s) => s.addProvider)
  const reorderProviders = useOCLandStore((s) => s.reorderProviders)
  const [addOpen, setAddOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleAdd = (values: { name: string; color: string; kanbanUrl?: string; sdkType: OCSdkType; endpoints: OCEndpoint[]; keys: OCProviderKey[]; models: OCModel[]; mcpServers?: McpServer[]; mcpServerRefs?: string[] }) => {
    addProvider({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      enabled: true,
      sdkType: values.sdkType,
      endpoints: values.endpoints.filter((ep) => ep.url.trim()),
      keys: values.keys ?? [],
      models: values.models ?? [],
      color: values.color || '#1677ff',
      kanbanUrl: values.kanbanUrl,
      mcpServers: values.mcpServers?.length ? values.mcpServers : undefined,
      mcpServerRefs: values.mcpServerRefs?.length ? values.mcpServerRefs : undefined
    })
    setAddOpen(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderProviders(active.id as string, over.id as string)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>{t('ocLaunch.providerList')}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({providers.length})</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          {t('ocLaunch.addProvider')}
        </Button>
      </div>

      {providers.length === 0
        ? <Empty description={t('ocLaunch.noProvider')} />
        : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={providers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {providers.map((p, idx) => (
                <SortableProviderCard key={p.id} provider={p} index={idx + 1} />
              ))}
            </SortableContext>
          </DndContext>
        )
      }

      <ProviderFormModal
        open={addOpen}
        title={t('ocLaunch.newProvider')}
        initialValues={{
          name: '',
          color: '#1677ff',
          sdkType: 'anthropic',
          kanbanUrl: '',
          endpoints: [{ id: crypto.randomUUID(), label: t('ocLaunch.defaultEndpoint'), url: '', useSystemProxy: false }],
          keys: [],
          models: []
        }}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
      />
    </div>
  )
}
