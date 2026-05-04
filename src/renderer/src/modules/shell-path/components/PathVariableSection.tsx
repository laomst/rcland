import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { App } from 'antd'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathVariable } from '@shared/builtin-functions'
import { PathVariableCard } from './PathVariableCard'
import { PathVariableFormModal, type PathVariableFormValues } from './PathVariableFormModal'
import { SortableList } from '@renderer/modules/shared/SortableList'

export function PathVariableSection(): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const pathVariables = useShellConfigStore((s) => s.shellConfig.pathVariables)
  const addPathVariable = useShellConfigStore((s) => s.addPathVariable)
  const reorderPathVariables = useShellConfigStore((s) => s.reorderPathVariables)

  const [addOpen, setAddOpen] = useState(false)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<PathVariableFormValues>({
    key: '',
    value: '',
    description: ''
  })

  const handleAdd = () => {
    const newVar = createEmptyPathVariable()
    addPathVariable(newVar)
    setEditingVarId(newVar.id)
    setInitialFormValues({
      key: '',
      value: '',
      description: ''
    })
    setAddOpen(true)
  }

  return (
    <div>
      <SortableList
        title="路径变量"
        items={pathVariables}
        onAdd={handleAdd}
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
              description: values.description.trim() || undefined
            })
            requestAnimationFrame(() => {
              const err = useShellConfigStore.getState().saveError
              if (err) {
                modal.error({ title: '无法保存', content: err, okText: t('common.confirm') })
                useShellConfigStore.getState().clearSaveError()
              } else {
                setEditingVarId(null)
                setAddOpen(false)
              }
            })
          }
        }}
      />
    </div>
  )
}
