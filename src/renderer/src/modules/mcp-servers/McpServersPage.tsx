import { useEffect, useState } from 'react'
import { Typography, Button, Spin, Empty } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useMcpServersStore } from '@renderer/stores/useMcpServersStore'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { McpServerCard } from './McpServerCard'
import { McpServerEditModal } from './McpServerEditModal'
import type { McpServer } from '@shared/types'

const { Title } = Typography

export function McpServersPage(): React.ReactElement {
  const { t } = useTranslation()
  const servers = useMcpServersStore((s) => s.servers)
  const loaded = useMcpServersStore((s) => s.loaded)
  const addServer = useMcpServersStore((s) => s.addServer)
  const reorderServers = useMcpServersStore((s) => s.reorderServers)

  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    useMcpServersStore.getState().loadData()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = servers.findIndex((s) => s.id === active.id)
      const newIndex = servers.findIndex((s) => s.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(servers, oldIndex, newIndex)
        reorderServers(reordered.map((s) => s.id))
      }
    }
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {t('mcp.title')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          {t('mcp.addServer')}
        </Button>
      </div>

      {servers.length === 0 ? (
        <Empty description={t('mcp.emptyList')} style={{ marginTop: 48 }} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={servers.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {servers.map((server) => (
              <SortableWrapper key={server.id} id={server.id}>
                {(dragHandleProps) => (
                  <McpServerCard server={server} dragHandleProps={dragHandleProps ?? undefined} />
                )}
              </SortableWrapper>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <McpServerEditModal
        open={addOpen}
        server={null}
        onOk={(newServer: McpServer) => {
          addServer(newServer)
          setAddOpen(false)
        }}
        onCancel={() => setAddOpen(false)}
      />
    </div>
  )
}
