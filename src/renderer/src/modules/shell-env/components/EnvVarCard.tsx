import { Space, Tooltip, Typography } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { ShellVariable } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { EnvVarFormModal } from './EnvVarFormModal'
import { BaseItemCard } from '@renderer/components/BaseItemCard'

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
  const updateVariable = useShellConfigStore((s) => s.updateVariable)

  return (
    <BaseItemCard
      item={variable}
      index={index}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      deleteConfirmContent={`确定删除环境变量 "${variable.key}" 吗？`}
      onUpdate={updateVariable}
      onRemove={(id) => useShellConfigStore.getState().removeVariable(id)}
      getAllItems={() => useShellConfigStore.getState().shellConfig.variables}
      renderContent={(item) => {
        const displayValue = item.encrypted
          ? '••••••••'
          : (item.value.length > 30 ? item.value.slice(0, 30) + '...' : item.value)
        return (
          <>
            {/* Key */}
            <Tooltip title={item.key}>
              <Text strong style={{ fontSize: 12, minWidth: 100, flexShrink: 0 }}>
                {item.key || '(未设置)'}
              </Text>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>=</Text>

            {/* Value */}
            <Tooltip title={item.encrypted ? '已加密' : item.value}>
              <Space size={4} style={{ flex: 1, minWidth: 0 }}>
                {item.encrypted && <LockOutlined style={{ fontSize: 12, color: '#999' }} />}
                <Text style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayValue || '(空)'}
                </Text>
              </Space>
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
          title={`编辑: ${variable.key}`}
          isEdit
          initialValues={{
            key: variable.key,
            value: variable.value,
            encrypted: variable.encrypted,
            description: variable.description ?? '',
            shells: variable.shells ?? [],
            localOnly: variable.localOnly ?? false
          }}
          okText="保存"
          onCancel={onClose}
          onOk={(values) => {
            updateVariable(variable.id, {
              key: values.key,
              value: values.value,
              encrypted: values.encrypted,
              description: values.description,
              shells: values.shells,
              localOnly: values.localOnly
            })
            onClose()
          }}
        />
      )}
    />
  )
}
