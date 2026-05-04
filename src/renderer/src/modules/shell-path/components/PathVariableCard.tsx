import { Tooltip, Typography, App } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PathVariable } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { PathVariableFormModal } from './PathVariableFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'
import { VariableRefDisplay } from '@renderer/components/VariableRefDisplay'

const { Text } = Typography

export function PathVariableCard({
  variable,
  index,
  isDragging,
  dragHandleProps
}: {
  variable: PathVariable
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const updatePathVariable = useShellConfigStore((s) => s.updatePathVariable)

  return (
    <BaseItemCard
      item={variable}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      hideSyncToggle
      deleteConfirmContent={t('shellEnv.deleteConfirm', { name: variable.key })}
      onUpdate={updatePathVariable}
      onRemove={(id) => {
        useShellConfigStore.getState().removePathVariable(id)
        requestAnimationFrame(() => {
          const err = useShellConfigStore.getState().saveError
          if (err) {
            modal.error({ title: '无法删除', content: err, okText: t('common.confirm') })
            useShellConfigStore.getState().clearSaveError()
          }
        })
      }}
      onDuplicate={(variable) => {
        useShellConfigStore.getState().addPathVariable({
          ...variable,
          id: crypto.randomUUID(),
          key: variable.key + '_COPY'
        })
      }}
      getAllItems={() => useShellConfigStore.getState().shellConfig.pathVariables}
      renderContent={(item) => {
        return (
          <>
            <Tooltip title={item.key}>
              <Text strong style={{ fontSize: 12, minWidth: 100, flexShrink: 0 }}>
                {item.key || t('common.notSet')}
              </Text>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>=</Text>

            <Tooltip title={item.value} mouseEnterDelay={0.3}>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <VariableRefDisplay text={item.value || t('common.empty')} maxLength={30} style={{ fontSize: 12, fontFamily: 'monospace' }} />
              </div>
            </Tooltip>

            {item.description && (
              <Tooltip title={item.description}>
                <Text type="secondary" style={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </Text>
              </Tooltip>
            )}
          </>
        )
      }}
      renderEditModal={(open, onClose) => (
        <PathVariableFormModal
          open={open}
          title={t('shellEnv.editItemTitle', { name: variable.key })}
          isEdit
          initialValues={{
            key: variable.key,
            value: variable.value,
            description: variable.description ?? ''
          }}
          okText={t('common.save')}
          onCancel={onClose}
          onOk={(values) => {
            updatePathVariable(variable.id, {
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
                onClose()
              }
            })
          }}
        />
      )}
    />
  )
}
