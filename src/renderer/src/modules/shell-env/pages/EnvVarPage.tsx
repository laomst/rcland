import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Spin } from 'antd'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyVariable } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { EnvVarCard } from '../components/EnvVarCard'
import { EnvVarFormModal, type EnvVarFormValues } from '../components/EnvVarFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title } = Typography

export function EnvVarPage(): React.ReactElement {
  const { t } = useTranslation()
  const variables = useShellConfigStore((s) => s.shellConfig.variables)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const addVariable = useShellConfigStore((s) => s.addVariable)
  const reorderVariables = useShellConfigStore((s) => s.reorderVariables)

  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<EnvVarFormValues>({
    key: '',
    value: '',
    encrypted: false,
    description: '',
    shells: [...ALL_SHELL_TYPES],
    localOnly: false
  })

  // Load data on mount
  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  const { sensors, handleDragEnd, syncItems: syncedVars, localItems: localVars } = useSortableList(
    variables,
    reorderVariables
  )

  const handleAdd = (localOnly: boolean) => {
    const newVar = createEmptyVariable()
    addVariable({
      ...newVar,
      localOnly,
      order: variables.length
    })
    setEditingVarId(newVar.id)
    setInitialFormValues({
      key: '',
      value: '',
      encrypted: false,
      description: '',
      shells: [...ALL_SHELL_TYPES],
      localOnly
    })
    setAddOpen(true)
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
      <Title level={4} style={{ marginBottom: 16 }}>{t('shellEnv.title')}</Title>

      <GroupHeader title={t('common.syncedConfig')} count={syncedVars.length} collapsed={syncCollapsed} onToggle={() => setSyncCollapsed(!syncCollapsed)} onAdd={() => handleAdd(false)} />
      {!syncCollapsed && syncedVars.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={syncedVars.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {syncedVars.map((v, idx) => (
              <SortableWrapper key={v.id} id={v.id}>
                {(dragHandleProps) => (
                  <EnvVarCard
                    variable={v}
                    index={idx + 1}
                    dragHandleProps={dragHandleProps as any}
                  />
                )}
              </SortableWrapper>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <GroupHeader title={t('common.localConfig')} count={localVars.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localVars.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localVars.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {localVars.map((v, idx) => (
              <SortableWrapper key={v.id} id={v.id}>
                {(dragHandleProps) => (
                  <EnvVarCard
                    variable={v}
                    index={syncedVars.length + idx + 1}
                    dragHandleProps={dragHandleProps as any}
                  />
                )}
              </SortableWrapper>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <EnvVarFormModal
        open={addOpen}
        title={editingVarId && variables.find(v => v.id === editingVarId)?.key ? t('shellEnv.editTitle') : t('shellEnv.addTitle')}
        initialValues={initialFormValues}
        okText={t('common.save')}
        onCancel={() => {
          // 如果是新建且没有填写 key，删除空白变量
          const editingVar = editingVarId ? variables.find(v => v.id === editingVarId) : null
          if (editingVar && !editingVar.key) {
            useShellConfigStore.getState().removeVariable(editingVar.id)
          }
          setEditingVarId(null)
          setAddOpen(false)
        }}
        onOk={(values) => {
          if (editingVarId) {
            useShellConfigStore.getState().updateVariable(editingVarId, {
              key: values.key.trim(),
              value: values.value,
              encrypted: values.encrypted,
              description: values.description.trim() || undefined,
              shells: values.shells.length > 0 ? values.shells : undefined,
              localOnly: values.localOnly
            })
          }
          setEditingVarId(null)
          setAddOpen(false)
        }}
      />

    </div>
  )
}
