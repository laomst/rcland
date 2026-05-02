import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathVariable } from '@shared/builtin-functions'
import { PathVariableCard } from './PathVariableCard'
import { PathVariableFormModal, type PathVariableFormValues } from './PathVariableFormModal'
import { GroupedSortableList } from '@renderer/modules/shared/GroupedSortableList'

export function PathVariableSection(): React.ReactElement {
  const { t } = useTranslation()
  const pathVariables = useShellConfigStore((s) => s.shellConfig.pathVariables)
  const addPathVariable = useShellConfigStore((s) => s.addPathVariable)
  const reorderPathVariables = useShellConfigStore((s) => s.reorderPathVariables)

  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<PathVariableFormValues>({
    key: '',
    value: '',
    description: '',
    localOnly: false
  })

  const handleAdd = (localOnly: boolean) => {
    const newVar = createEmptyPathVariable()
    addPathVariable({
      ...newVar,
      localOnly,
      order: pathVariables.length
    })
    setEditingVarId(newVar.id)
    setInitialFormValues({
      key: '',
      value: '',
      description: '',
      localOnly
    })
    setAddOpen(true)
  }

  return (
    <div>
      <GroupedSortableList
        titleSynced={t('common.syncedConfig')}
        titleLocal={t('common.localConfig')}
        items={pathVariables}
        syncCollapsed={syncCollapsed}
        localCollapsed={localCollapsed}
        onToggleSync={() => setSyncCollapsed(!syncCollapsed)}
        onToggleLocal={() => setLocalCollapsed(!localCollapsed)}
        onAddSync={() => handleAdd(false)}
        onAddLocal={() => handleAdd(true)}
        onReorder={reorderPathVariables}
        renderItem={(variable, index, dragHandleProps) => (
          <PathVariableCard variable={variable} index={index} dragHandleProps={dragHandleProps} />
        )}
      />

      <PathVariableFormModal
        open={addOpen}
        title={editingVarId && pathVariables.find(v => v.id === editingVarId)?.key ? '编辑路径变量' : '添加路径变量'}
        initialValues={initialFormValues}
        okText={t('common.save')}
        onCancel={() => {
          const editingVar = editingVarId ? pathVariables.find(v => v.id === editingVarId) : null
          if (editingVar && !editingVar.key) {
            useShellConfigStore.getState().removePathVariable(editingVar.id)
          }
          setEditingVarId(null)
          setAddOpen(false)
        }}
        onOk={(values) => {
          if (editingVarId) {
            useShellConfigStore.getState().updatePathVariable(editingVarId, {
              key: values.key.trim(),
              value: values.value,
              description: values.description.trim() || undefined,
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
