import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Space, Switch, Typography, Tooltip, App, Tag, Select } from 'antd'
import { EditOutlined, DeleteOutlined, LockOutlined, EyeOutlined } from '@ant-design/icons'
import type { ShellFunction } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { FunctionFormModal } from './FunctionFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

const { Text } = Typography

/** Flexible column style with ellipsis */
const flexCol = (flex: number): React.CSSProperties => ({
  flex,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export function FunctionCard({
  func,
  index,
  isDragging,
  dragHandleProps
}: {
  func: ShellFunction
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()

  const categoryConfig: Record<string, { label: string; color: string }> = {
    builtin: { label: t('shellFunctions.categories.builtin'), color: 'geekblue' },
    git: { label: 'Git', color: 'orange' },
    fs: { label: t('shellFunctions.categories.filesystem'), color: 'green' },
    network: { label: t('shellFunctions.categories.network'), color: 'blue' },
    dev: { label: t('shellFunctions.categories.dev'), color: 'purple' },
    system: { label: t('shellFunctions.categories.system'), color: 'cyan' },
    archive: { label: t('shellFunctions.categories.archive'), color: 'gold' },
    search: { label: t('shellFunctions.categories.search'), color: 'lime' },
    process: { label: t('shellFunctions.categories.process'), color: 'red' },
    custom: { label: t('shellFunctions.categories.custom'), color: 'default' },
  }

  const updateFunction = useShellConfigStore((s) => s.updateFunction)
  const removeFunction = useShellConfigStore((s) => s.removeFunction)
  const [editOpen, setEditOpen] = useState(false)

  const categoryInfo = categoryConfig[func.category] || categoryConfig.custom
  const shellsWithBody = Object.keys(func.body).filter((k) => func.body[k as keyof typeof func.body]?.trim()).length

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={func.enabled}
        borderColor="#d9d9d9"
        dragHandleProps={func.builtIn ? undefined : dragHandleProps}
        showDragHandle={!func.builtIn}
        actions={<>
          {func.builtIn ? (
            <>
              <Tag color="geekblue" icon={<LockOutlined />} style={{ margin: 0 }}>{t('shellFunctions.builtIn')}</Tag>
              <Tooltip title={t('shellFunctions.view')}>
                <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setEditOpen(true)} />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title={t('common.edit')}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    modal.confirm({
                      title: t('common.confirmDelete'),
                      content: t('shellFunctions.deleteConfirm', { name: func.name }),
                      okText: t('common.delete'),
                      okType: 'danger',
                      cancelText: t('common.cancel'),
                      onOk: () => removeFunction(func.id)
                    })
                  }}
                />
              </Tooltip>
              <Select
                size="small"
                variant="borderless"
                value={func.localOnly ? 'local' : 'sync'}
                onChange={(val) => {
                  const newLocalOnly = val === 'local'
                  updateFunction(func.id, { localOnly: newLocalOnly })
                }}
                style={{ width: 70 }}
                options={[
                  { value: 'sync', label: t('common.synced') },
                  { value: 'local', label: t('common.local') }
                ]}
              />
            </>
          )}
          <Tooltip title={func.builtIn ? t('shellFunctions.builtInNoDisable') : undefined}>
            <Switch
              size="small"
              checked={func.enabled}
              disabled={func.builtIn}
              onChange={(checked) => updateFunction(func.id, { enabled: checked })}
            />
          </Tooltip>
        </>}
      >
        {/* Placeholder for missing drag handle in built-in functions */}
        {func.builtIn && <div style={{ width: 14, flexShrink: 0 }} />}

        {/* Category Tag */}
        <Tag color={categoryInfo.color} style={{ margin: 0, flexShrink: 0 }}>
          {categoryInfo.label}
        </Tag>

        {/* Function Name */}
        <Tooltip title={func.description || func.name}>
          <Space size={6} style={flexCol(1)}>
            <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{func.name}</Text>
            {func.description && (
              <Text type="secondary" style={{ fontSize: 11 }}>- {func.description}</Text>
            )}
          </Space>
        </Tooltip>

        {/* Shell body indicator */}
        <Tooltip title={t('shellFunctions.shellImplCount', { count: shellsWithBody })}>
          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
            [{shellsWithBody} shell{shellsWithBody !== 1 ? 's' : ''}]
          </Text>
        </Tooltip>
      </ItemRow>

      <FunctionFormModal
        open={editOpen}
        title={func.builtIn ? t('shellFunctions.viewBuiltinTitle', { name: func.name }) : t('shellFunctions.editItemTitle', { name: func.name })}
        initialValues={{
          name: func.name,
          category: func.category,
          description: func.description || '',
          body: { ...func.body },
          localOnly: func.localOnly ?? false
        }}
        okText={t('common.save')}
        readOnly={func.builtIn}
        onCancel={() => setEditOpen(false)}
        onOk={(values) => {
          if (func.builtIn) return
          updateFunction(func.id, {
            name: values.name,
            category: values.category,
            description: values.description,
            body: values.body,
            localOnly: values.localOnly
          })
          setEditOpen(false)
        }}
      />
    </>
  )
}
