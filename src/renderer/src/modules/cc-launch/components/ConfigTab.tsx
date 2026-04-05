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
    localOnly?: boolean
  }) => {
    const config = createEmptyConfig(values.providerId, values.endpointId, values.keyId)
    addConfig({
      ...config,
      name: values.name.trim(),
      funcName: values.funcName.trim(),
      envVars: values.envVars,
      localOnly: values.localOnly
    })
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
      {providers.length === 0
        ? <Empty description="请先在「供应商管理」中添加供应商" />
        : configs.length === 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Empty description="暂无配置" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                添加配置
              </Button>
            </div>
          )
          : (
            <>
              {/* 同步配置 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14 }}>同步配置 ({syncedConfigs.length})</Text>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => setAddOpen(true)}
                >
                  添加
                </Button>
              </div>
              {syncedConfigs.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={syncedConfigs.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {syncedConfigs.map((c, idx) => (
                      <SortableConfigCard key={c.id} config={c} providers={providers} index={idx + 1} />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* 本机配置 */}
              <Text strong style={{ fontSize: 14, display: 'block', marginTop: 16, marginBottom: 8 }}>
                本机配置 ({localConfigs.length})
              </Text>
              {localConfigs.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={localConfigs.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {localConfigs.map((c, idx) => (
                      <SortableConfigCard key={c.id} config={c} providers={providers} index={syncedConfigs.length + idx + 1} />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </>
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
          envVars: firstTemplateEnvVars,
          localOnly: false
        }}
        okText="添加"
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        onAddKey={handleAddKey}
      />
    </div>
  )
}
