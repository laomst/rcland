import { Space, Tooltip, Typography, App } from 'antd'
import { useTranslation } from 'react-i18next'
import { LockOutlined } from '@ant-design/icons'
import type { ShellVariable } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { EnvVarFormModal } from './EnvVarFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'
import { VariableRefDisplay } from '@renderer/components/VariableRefDisplay'

const { Text } = Typography

export function EnvVarCard({
  variable,
  index,
  isDragging,
  dragHandleProps
}: {
  variable: ShellVariable
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const updateVariable = useShellConfigStore((s) => s.updateVariable)

  return (
    <BaseItemCard
      item={variable}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      deleteConfirmContent={t('shellEnv.deleteConfirm', { name: variable.key })}
      onUpdate={updateVariable}
      onRemove={(id) => {
        useShellConfigStore.getState().removeVariable(id)
        requestAnimationFrame(() => {
          const err = useShellConfigStore.getState().saveError
          if (err) {
            modal.error({
              title: '无法删除',
              content: err,
              okText: t('common.confirm')
            })
            useShellConfigStore.getState().clearSaveError()
          }
        })
      }}
      onDuplicate={(variable) => {
        useShellConfigStore.getState().addVariableAfter(variable.id, {
          ...variable,
          id: crypto.randomUUID(),
          key: variable.key + '_COPY'
        })
      }}
      getAllItems={() => useShellConfigStore.getState().shellConfig.variables}
      renderContent={(item) => {
        const displayValue = item.encrypted
          ? '••••••••'
          : item.value
        return (
          <>
            <Tooltip title={item.key}>
              <Text strong style={{ fontSize: 12, minWidth: 100, flexShrink: 0 }}>
                {item.key || t('common.notSet')}
              </Text>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>=</Text>

            <Tooltip title={item.encrypted ? t('common.encrypted') : item.value} mouseEnterDelay={0.3}>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Space size={4}>
                  {item.encrypted && <LockOutlined style={{ fontSize: 12, color: '#999' }} />}
                  {item.encrypted
                    ? <Text style={{ fontSize: 12 }}>{displayValue}</Text>
                    : <VariableRefDisplay text={displayValue} maxLength={30} style={{ fontSize: 12 }} />
                  }
                </Space>
              </div>
            </Tooltip>

            {/* Description */}
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
        <EnvVarFormModal
          open={open}
          title={t('shellEnv.editItemTitle', { name: variable.key })}
          isEdit
          initialValues={{
            key: variable.key,
            value: variable.value,
            encrypted: variable.encrypted,
            description: variable.description ?? '',
            shells: variable.shells ?? []
          }}
          okText={t('common.save')}
          onCancel={onClose}
          onOk={(values) => {
            updateVariable(variable.id, {
              key: values.key,
              value: values.value,
              encrypted: values.encrypted,
              description: values.description,
              shells: values.shells
            })
            onClose()
          }}
        />
      )}
    />
  )
}
