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
import type { CXEndpoint, CXProvider, CXProviderKey } from '@shared/types'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { CXProviderCard } from './CXProviderCard'
import { CXProviderFormModal } from './CXProviderFormModal'

const { Text } = Typography

interface SortableCXProviderCardProps {
  provider: CXProvider
  index: number
}

function SortableCXProviderCard({ provider, index }: SortableCXProviderCardProps) {
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
      <CXProviderCard
        provider={provider}
        index={index}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function CXProviderTab(): React.ReactElement {
  const { t } = useTranslation()
  const providers = useCXLandStore((s) => s.data.providers)
  const addCXProvider = useCXLandStore((s) => s.addCXProvider)
  const reorderCXProviders = useCXLandStore((s) => s.reorderCXProviders)
  const [addOpen, setAddOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleAdd = (values: { name: string; color: string; wireApi: 'responses' | 'chat'; endpoints: CXEndpoint[]; keys: CXProviderKey[] }) => {
    addCXProvider({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      enabled: true,
      wireApi: values.wireApi,
      endpoints: values.endpoints.filter((ep) => ep.url.trim()),
      keys: values.keys ?? [],
      color: values.color || '#1677ff'
    })
    setAddOpen(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderCXProviders(active.id as string, over.id as string)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>{t('ccLaunch.providerList')}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({providers.length})</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          {t('ccLaunch.addProvider')}
        </Button>
      </div>

      {providers.length === 0
        ? <Empty description={t('ccLaunch.noProvider')} />
        : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={providers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {providers.map((p, idx) => (
                <SortableCXProviderCard key={p.id} provider={p} index={idx + 1} />
              ))}
            </SortableContext>
          </DndContext>
        )
      }

      <CXProviderFormModal
        open={addOpen}
        title={t('ccLaunch.newProvider')}
        initialValues={{
          name: '',
          color: '#1677ff',
          wireApi: 'chat',
          endpoints: [{ id: crypto.randomUUID(), label: t('ccLaunch.defaultEndpoint'), url: '', useSystemProxy: false }],
          keys: []
        }}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
      />
    </div>
  )
}
