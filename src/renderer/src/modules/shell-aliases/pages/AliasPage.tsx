import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { AliasCard } from '@renderer/modules/shell-aliases/components/AliasCard'
import { AliasFormModal, type AliasFormValues } from '@renderer/modules/shell-aliases/components/AliasFormModal'
import { createEmptyAlias } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { GroupedSortableList } from '@renderer/modules/shared/GroupedSortableList'

const { Title } = Typography

export default function AliasPage(): React.ReactElement {
  const { t } = useTranslation()
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
      <Title level={4} style={{ marginBottom: 16 }}>{t('shellAliases.title')}</Title>

      <GroupedSortableList
        titleSynced={t('common.syncedConfig')}
        titleLocal={t('common.localConfig')}
        items={aliases}
        syncCollapsed={syncCollapsed}
        localCollapsed={localCollapsed}
        onToggleSync={() => setSyncCollapsed(!syncCollapsed)}
        onToggleLocal={() => setLocalCollapsed(!localCollapsed)}
        onAddSync={() => handleAdd(false)}
        onAddLocal={() => handleAdd(true)}
        onReorder={reorderAliases}
        renderItem={(alias, index, dragHandleProps) => (
          <AliasCard alias={alias} index={index} dragHandleProps={dragHandleProps} />
        )}
      />

      <AliasFormModal
        open={addModalOpen}
        title={editingAliasId && aliases.find(a => a.id === editingAliasId)?.alias ? t('shellAliases.editTitle') : t('shellAliases.addTitle')}
        initialValues={initialFormValues}
        okText={t('common.save')}
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
