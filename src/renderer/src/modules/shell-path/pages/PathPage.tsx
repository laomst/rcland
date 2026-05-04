import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Spin, Tabs, Alert } from 'antd'
import { EnvironmentOutlined, ToolOutlined } from '@ant-design/icons'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyPathEntry } from '@shared/builtin-functions'
import { getOsSupportedShells } from '@shared/shell'
import { PathCard } from '../components/PathCard'
import { PathVariableSection } from '../components/PathVariableSection'
import { PathFormModal, type PathFormValues } from '../components/PathFormModal'
import { SortableList } from '@renderer/modules/shared/SortableList'

const { Title } = Typography

export function PathPage(): React.ReactElement {
  const { t } = useTranslation()
  const pathEntries = useShellConfigStore((s) => s.shellConfig.pathEntries)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const addPathEntry = useShellConfigStore((s) => s.addPathEntry)
  const reorderPathEntries = useShellConfigStore((s) => s.reorderPathEntries)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  const handleConfirmAdd = (values: PathFormValues) => {
    const newEntry = createEmptyPathEntry()
    addPathEntry({
      ...newEntry,
      path: values.path.trim(),
      description: values.description.trim() || undefined,
      shells: values.shells.length > 0 ? values.shells : undefined,
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
      <Alert message={t('shellPath.localOnlyHint')} type="info" showIcon style={{ marginBottom: 16 }} />

      <Tabs
        defaultActiveKey="entries"
        items={[
          {
            key: 'entries',
            label: 'PATH 条目',
            icon: <EnvironmentOutlined />,
            children: (
              <>
                <SortableList
                  title="PATH 条目"
                  items={pathEntries}
                  onAdd={() => setAddOpen(true)}
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
                    shells: [...getOsSupportedShells()]
                  }}
                  okText={t('common.add')}
                  onCancel={() => setAddOpen(false)}
                  onOk={handleConfirmAdd}
                />
              </>
            )
          },
          {
            key: 'variables',
            label: '路径变量',
            icon: <ToolOutlined />,
            children: <PathVariableSection />
          }
        ]}
      />
    </div>
  )
}
