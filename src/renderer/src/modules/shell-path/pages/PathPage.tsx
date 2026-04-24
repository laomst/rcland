import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Spin } from 'antd'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathEntry } from '@shared/builtin-functions'
import { getOsSupportedShells } from '@shared/shell'
import { PathCard } from '../components/PathCard'
import { PathFormModal, type PathFormValues } from '../components/PathFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title } = Typography

export function PathPage(): React.ReactElement {
  const { t } = useTranslation()
  const pathEntries = useShellConfigStore((s) => s.shellConfig.pathEntries)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const addPathEntry = useShellConfigStore((s) => s.addPathEntry)
  const reorderPathEntries = useShellConfigStore((s) => s.reorderPathEntries)
  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addLocalOnly, setAddLocalOnly] = useState(false)

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

  const handleAdd = (localOnly: boolean) => {
    setAddLocalOnly(localOnly)
    setAddOpen(true)
  }

  const handleConfirmAdd = (values: PathFormValues) => {
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
      <Title level={4} style={{ marginBottom: 16 }}>{t('shellPath.title')}</Title>

      <GroupHeader title={t('common.syncedConfig')} count={syncedPaths.length} collapsed={syncCollapsed} onToggle={() => setSyncCollapsed(!syncCollapsed)} onAdd={() => handleAdd(false)} />
      {!syncCollapsed && syncedPaths.length > 0 && (
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
      )}

      <GroupHeader title={t('common.localConfig')} count={localPaths.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localPaths.length > 0 && (
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
      )}

      <PathFormModal
        open={addOpen}
        title={t('shellPath.addTitle')}
        initialValues={{
          path: '',
          description: '',
          shells: [...getOsSupportedShells()],
          localOnly: addLocalOnly
        }}
        okText={t('common.add')}
        onCancel={() => setAddOpen(false)}
        onOk={handleConfirmAdd}
      />
    </div>
  )
}
