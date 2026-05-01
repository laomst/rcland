import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Spin } from 'antd'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathEntry } from '@shared/builtin-functions'
import { getOsSupportedShells } from '@shared/shell'
import { PathCard } from '../components/PathCard'
import { PathFormModal, type PathFormValues } from '../components/PathFormModal'
import { GroupedSortableList } from '@renderer/modules/shared/GroupedSortableList'

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

      <GroupedSortableList
        titleSynced={t('common.syncedConfig')}
        titleLocal={t('common.localConfig')}
        items={pathEntries}
        syncCollapsed={syncCollapsed}
        localCollapsed={localCollapsed}
        onToggleSync={() => setSyncCollapsed(!syncCollapsed)}
        onToggleLocal={() => setLocalCollapsed(!localCollapsed)}
        onAddSync={() => handleAdd(false)}
        onAddLocal={() => handleAdd(true)}
        onReorder={reorderPathEntries}
        renderItem={(pathEntry, index, dragHandleProps) => (
          <PathCard pathEntry={pathEntry} index={index} dragHandleProps={dragHandleProps} />
        )}
      />

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
