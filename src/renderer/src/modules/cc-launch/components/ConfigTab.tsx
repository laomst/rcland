import { useState } from 'react'
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
import { useAppStore, createEmptyConfig } from '@renderer/stores/useAppStore'
import { ConfigCard } from './ConfigCard'
import { ConfigFormModal } from './ConfigFormModal'
import type { ConfigSet, Provider } from '@shared/types'

const { Text } = Typography

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
  const configs = useAppStore((s) => s.configs)
  const providers = useAppStore((s) => s.providers)
  const addConfig = useAppStore((s) => s.addConfig)
  const reorderConfigs = useAppStore((s) => s.reorderConfigs)
  const [addOpen, setAddOpen] = useState(false)

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

  const handleAdd = (values: {
    providerId: string
    endpointId: string
    keyId: string
    name: string
    funcName: string
    envVars: typeof configs[number]['envVars']
  }) => {
    const config = createEmptyConfig(values.providerId, values.endpointId, values.keyId)
    addConfig({
      ...config,
      name: values.name.trim(),
      funcName: values.funcName.trim(),
      envVars: values.envVars
    })
    setAddOpen(false)
  }

  const handleAddKey = () => {
    // TODO: Open provider edit modal to add key
    // For now, user needs to go to provider tab first
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderConfigs(active.id as string, over.id as string)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>配置列表</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({configs.length} 个)</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
          disabled={providers.length === 0}
        >
          添加配置
        </Button>
      </div>

      {providers.length === 0
        ? <Empty description="请先在「供应商管理」中添加供应商" />
        : configs.length === 0
          ? <Empty description="暂无配置，点击右上角添加" />
          : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={configs.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {configs.map((c, idx) => (
                  <SortableConfigCard key={c.id} config={c} providers={providers} index={idx + 1} />
                ))}
              </SortableContext>
            </DndContext>
          )
      }

      <ConfigFormModal
        open={addOpen}
        title="新建配置"
        providers={providers}
        initialValues={{
          providerId: firstProvider?.id ?? '',
          endpointId: firstEndpointId,
          keyId: firstKeyId,
          name: '',
          funcName: '',
          envVars: firstTemplateEnvVars
        }}
        okText="添加"
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        onAddKey={handleAddKey}
      />
    </div>
  )
}
