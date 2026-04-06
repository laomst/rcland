import { useState, useEffect } from 'react'
import { Typography } from 'antd'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { AliasCard } from '@renderer/modules/shell-aliases/components/AliasCard'
import { AliasFormModal, type AliasFormValues } from '@renderer/modules/shell-aliases/components/AliasFormModal'
import { createEmptyAlias } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title } = Typography

export default function AliasPage(): React.ReactElement {
  const aliases = useShellConfigStore((s) => s.shellConfig.aliases)
  const reorderAliases = useShellConfigStore((s) => s.reorderAliases)
  const addAlias = useShellConfigStore((s) => s.addAlias)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)

  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<AliasFormValues>({
    alias: '', command: '', description: '', shells: [...ALL_SHELL_TYPES], localOnly: false
  })

  useEffect(() => {
    if (!dataLoaded) loadShellConfig()
  }, [dataLoaded, loadShellConfig])

  const { sensors, handleDragEnd, syncItems, localItems } = useSortableList(aliases, reorderAliases)

  const handleAdd = (localOnly: boolean) => {
    const newAlias = createEmptyAlias()
    newAlias.order = aliases.length
    newAlias.localOnly = localOnly
    addAlias(newAlias)
    setEditingAliasId(newAlias.id)
    setInitialFormValues({
      alias: '', command: '', description: '', shells: [...ALL_SHELL_TYPES], localOnly
    })
    setAddModalOpen(true)
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Shell 别名</Title>

      <GroupHeader title="同步配置" count={syncItems.length} collapsed={syncCollapsed} onToggle={() => setSyncCollapsed(!syncCollapsed)} onAdd={() => handleAdd(false)} />
      {!syncCollapsed && syncItems.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={syncItems.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            {syncItems.map((alias, idx) => (
              <SortableWrapper key={alias.id} id={alias.id}>
                {(dragHandleProps) => (
                  <AliasCard alias={alias} index={idx + 1} dragHandleProps={dragHandleProps as any} />
                )}
              </SortableWrapper>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <GroupHeader title="本机配置" count={localItems.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localItems.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localItems.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            {localItems.map((alias, idx) => (
              <SortableWrapper key={alias.id} id={alias.id}>
                {(dragHandleProps) => (
                  <AliasCard alias={alias} index={syncItems.length + idx + 1} dragHandleProps={dragHandleProps as any} />
                )}
              </SortableWrapper>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <AliasFormModal
        open={addModalOpen}
        title={editingAliasId && aliases.find(a => a.id === editingAliasId)?.alias ? "编辑别名" : "添加别名"}
        initialValues={initialFormValues}
        okText="保存"
        onCancel={() => {
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
              alias: values.alias, command: values.command,
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
