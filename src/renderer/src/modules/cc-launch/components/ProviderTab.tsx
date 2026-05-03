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
import type { EnvVarsMap, Provider, ProviderEndpoint, ProviderKey } from '@shared/types'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import { ProviderCard } from './ProviderCard'
import { ProviderFormModal } from './ProviderFormModal'

const { Text } = Typography

interface SortableProviderCardProps {
  provider: Provider
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
  const providers = useCCLaunchStore((s) => s.providers)
  const addProvider = useCCLaunchStore((s) => s.addProvider)
  const reorderProviders = useCCLaunchStore((s) => s.reorderProviders)
  const dictItems = useClaudeEnvDictStore((s) => s.items)
  const [addOpen, setAddOpen] = useState(false)

  const buildDefaultTemplateEnvVars = (): EnvVarsMap => {
    const result: EnvVarsMap = {}
    for (const item of dictItems) {
      if (item.defaultInTemplate) {
        result[item.key] = { value: '', enabled: false }
      }
    }
    return result
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleAdd = (values: { name: string; color: string; kanbanUrl: string; endpoints: ProviderEndpoint[]; keys: ProviderKey[]; template: { envVars: EnvVarsMap } }) => {
    addProvider({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      enabled: true,
      endpoints: values.endpoints.filter((ep) => ep.url.trim()),
      keys: values.keys ?? [],
      color: values.color || '#1677ff',
      kanbanUrl: values.kanbanUrl,
      template: values.template
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
          <Text strong style={{ fontSize: 15 }}>{t('ccLaunch.providerList')}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({providers.length} 个)</Text>
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
                <SortableProviderCard key={p.id} provider={p} index={idx + 1} />
              ))}
            </SortableContext>
          </DndContext>
        )
      }

      <ProviderFormModal
        open={addOpen}
        title={t('ccLaunch.newProvider')}
        initialValues={{
          name: '',
          color: '#1677ff',
          kanbanUrl: '',
          endpoints: [{ id: crypto.randomUUID(), label: t('ccLaunch.defaultEndpoint'), url: '', useSystemProxy: false }],
          keys: [],
          template: { envVars: buildDefaultTemplateEnvVars() }
        }}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
      />
    </div>
  )
}
