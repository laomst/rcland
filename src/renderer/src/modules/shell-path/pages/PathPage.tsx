import { useState, useEffect } from 'react'
import { Button, Empty, Typography, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathEntry } from '@shared/builtin-functions'
import { getOsSupportedShells } from '@shared/shell'
import { PathCard } from '../components/PathCard'
import { PathFormModal, type PathFormValues } from '../components/PathFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Text } = Typography

export function PathPage(): React.ReactElement {
  const pathEntries = useShellConfigStore((s) => s.shellConfig.pathEntries)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const addPathEntry = useShellConfigStore((s) => s.addPathEntry)
  const reorderPathEntries = useShellConfigStore((s) => s.reorderPathEntries)
  const [addOpen, setAddOpen] = useState(false)

  // Load data on mount
  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  const { sensors, handleDragEnd, syncItems: syncedPaths, localItems: localPaths } = useSortableList(
    pathEntries,
    reorderPathEntries
  )

  const handleAdd = (values: PathFormValues) => {
    const newEntry = createEmptyPathEntry()
    addPathEntry({
      ...newEntry,
      path: values.path.trim(),
      description: values.description.trim() || undefined,
      shells: values.shells.length > 0 ? values.shells : undefined,
      localOnly: values.localOnly,
      order: pathEntries.length
    })
    setAddOpen(false)
  }

  if (!dataLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>PATH 环境变量</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({pathEntries.length} 个)</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          添加路径
        </Button>
      </div>

      {pathEntries.length === 0
        ? <Empty description="暂无 PATH 条目，点击右上角添加" />
        : (
          <>
            {syncedPaths.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  同步配置 ({syncedPaths.length})
                </Text>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={syncedPaths.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {syncedPaths.map((p, idx) => (
                      <SortableWrapper key={p.id} id={p.id}>
                        {(dragHandleProps) => (
                          <PathCard
                            pathEntry={p}
                            index={idx + 1}
                            dragHandleProps={dragHandleProps as any}
                          />
                        )}
                      </SortableWrapper>
                    ))}
                  </SortableContext>
                </DndContext>
              </>
            )}
            {localPaths.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: syncedPaths.length > 0 ? 16 : 0, marginBottom: 8 }}>
                  本机配置 ({localPaths.length})
                </Text>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={localPaths.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {localPaths.map((p, idx) => (
                      <SortableWrapper key={p.id} id={p.id}>
                        {(dragHandleProps) => (
                          <PathCard
                            pathEntry={p}
                            index={syncedPaths.length + idx + 1}
                            dragHandleProps={dragHandleProps as any}
                          />
                        )}
                      </SortableWrapper>
                    ))}
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )
      }

      <PathFormModal
        open={addOpen}
        title="新建 PATH 条目"
        initialValues={{
          path: '',
          description: '',
          shells: [...getOsSupportedShells()],
          localOnly: false
        }}
        okText="添加"
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
      />
    </div>
  )
}
