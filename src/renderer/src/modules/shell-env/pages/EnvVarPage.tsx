import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Spin, App } from 'antd'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyVariable } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { findLocalRefs } from '@shared/var-refs'
import { EnvVarCard } from '../components/EnvVarCard'
import { EnvVarFormModal, type EnvVarFormValues } from '../components/EnvVarFormModal'
import { GroupedSortableList } from '@renderer/modules/shared/GroupedSortableList'

const { Title } = Typography

export function EnvVarPage(): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
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

  const handleAdd = (localOnly: boolean) => {
    const newVar = createEmptyVariable()
    addVariable({
      ...newVar,
      localOnly
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

      <GroupedSortableList
        titleSynced={t('common.syncedConfig')}
        titleLocal={t('common.localConfig')}
        items={variables}
        syncCollapsed={syncCollapsed}
        localCollapsed={localCollapsed}
        onToggleSync={() => setSyncCollapsed(!syncCollapsed)}
        onToggleLocal={() => setLocalCollapsed(!localCollapsed)}
        onAddSync={() => handleAdd(false)}
        onAddLocal={() => handleAdd(true)}
        onReorder={reorderVariables}
        renderItem={(variable, index, dragHandleProps) => (
          <EnvVarCard variable={variable} index={index} dragHandleProps={dragHandleProps} />
        )}
      />

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
            if (!values.localOnly) {
              const localRefs = findLocalRefs(values.value, variables)
              if (localRefs.length > 0) {
                modal.error({
                  title: t('common.operationFailed'),
                  content: t('shellEnv.syncedVarCannotRefLocal', { keys: localRefs.join(', ') }),
                  okText: t('common.confirm')
                })
                return
              }
            }
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
