import { useState, useEffect } from 'react'
import { Button, Empty, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { AliasCard } from '@renderer/modules/shell-aliases/components/AliasCard'
import { AliasFormModal, type AliasFormValues } from '@renderer/modules/shell-aliases/components/AliasFormModal'
import { createEmptyAlias } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title, Text } = Typography

export default function AliasPage(): React.ReactElement {
  const aliases = useShellConfigStore((s) => s.shellConfig.aliases)
  const reorderAliases = useShellConfigStore((s) => s.reorderAliases)
  const addAlias = useShellConfigStore((s) => s.addAlias)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<AliasFormValues>({
    alias: '',
    command: '',
    description: '',
    shells: [...ALL_SHELL_TYPES],
    localOnly: false
  })

  // Load shell config on mount
  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  const { sensors, handleDragEnd, syncItems: syncedAliases, localItems: localAliases } = useSortableList(
    aliases,
    reorderAliases
  )

  // 添加空白别名
  const handleAddAlias = () => {
    const newAlias = createEmptyAlias()
    newAlias.order = aliases.length
    addAlias(newAlias)
    setEditingAliasId(newAlias.id)
    setInitialFormValues({
      alias: '',
      command: '',
      description: '',
      shells: [...ALL_SHELL_TYPES],
      localOnly: false
    })
    setAddModalOpen(true)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Shell 别名</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddAlias}
        >
          添加别名
        </Button>
      </div>

      {aliases.length === 0 ? (
        <Empty
          description="暂无别名配置"
          style={{ marginTop: 48 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAlias}>
            添加第一个别名
          </Button>
        </Empty>
      ) : (
        <>
          {syncedAliases.length > 0 && (
            <>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                同步配置 ({syncedAliases.length})
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={syncedAliases.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {syncedAliases.map((alias, idx) => (
                    <SortableWrapper key={alias.id} id={alias.id}>
                      {(dragHandleProps) => (
                        <AliasCard
                          alias={alias}
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
          {localAliases.length > 0 && (
            <>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: syncedAliases.length > 0 ? 16 : 0, marginBottom: 8 }}>
                本机配置 ({localAliases.length})
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localAliases.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {localAliases.map((alias, idx) => (
                    <SortableWrapper key={alias.id} id={alias.id}>
                      {(dragHandleProps) => (
                        <AliasCard
                          alias={alias}
                          index={syncedAliases.length + idx + 1}
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
      )}

      <AliasFormModal
        open={addModalOpen}
        title={editingAliasId && aliases.find(a => a.id === editingAliasId)?.alias ? "编辑别名" : "添加别名"}
        initialValues={initialFormValues}
        okText="保存"
        onCancel={() => {
          // 如果是新建且没有填写 alias，删除空白别名
          const editingAlias = editingAliasId ? aliases.find(a => a.id === editingAliasId) : null
          if (editingAlias && !editingAlias.alias) {
            useShellConfigStore.getState().removeAlias(editingAlias.id)
          }
          setEditingAliasId(null)
          setAddModalOpen(false)
        }}
        onOk={(values) => {
          if (editingAliasId) {
            useShellConfigStore.getState().updateAlias(editingAliasId, {
              alias: values.alias,
              command: values.command,
              description: values.description || undefined,
              shells: values.shells.length > 0 ? values.shells as any : undefined,
              localOnly: values.localOnly
            })
          }
          setEditingAliasId(null)
          setAddModalOpen(false)
        }}
      />

    </div>
  )
}
