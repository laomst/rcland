import { useState } from 'react'
import { Button, Space, Switch, Typography, Tooltip, App, Tag, Select } from 'antd'
import { EditOutlined, DeleteOutlined, LockOutlined, EyeOutlined } from '@ant-design/icons'
import type { ShellFunction } from '@shared/shell-types'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { FunctionFormModal } from './FunctionFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

const { Text } = Typography

/** Category labels and colors */
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  builtin: { label: '内置', color: 'geekblue' },
  git: { label: 'Git', color: 'orange' },
  fs: { label: '文件系统', color: 'green' },
  network: { label: '网络', color: 'blue' },
  dev: { label: '开发', color: 'purple' },
  system: { label: '系统', color: 'cyan' },
  archive: { label: '归档', color: 'gold' },
  custom: { label: '自定义', color: 'default' }
}

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
  const { modal } = App.useApp()
  const updateFunction = useShellConfigStore((s) => s.updateFunction)
  const removeFunction = useShellConfigStore((s) => s.removeFunction)
  const [editOpen, setEditOpen] = useState(false)

  const categoryInfo = CATEGORY_CONFIG[func.category] || CATEGORY_CONFIG.custom
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
              <Tag color="geekblue" icon={<LockOutlined />} style={{ margin: 0 }}>内置</Tag>
              <Tooltip title="查看">
                <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setEditOpen(true)} />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="编辑">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    modal.confirm({
                      title: '确认删除',
                      content: `确定删除函数 "${func.name}" 吗？`,
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
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
                  const allFuncs = useShellConfigStore.getState().shellConfig.functions
                  const targetGroup = allFuncs.filter((f) => !f.builtIn && !!f.localOnly === newLocalOnly)
                  const maxOrder = targetGroup.length > 0 ? Math.max(...targetGroup.map((f) => f.order)) + 1 : 0
                  updateFunction(func.id, { localOnly: newLocalOnly, order: maxOrder })
                }}
                style={{ width: 70 }}
                options={[
                  { value: 'sync', label: '同步' },
                  { value: 'local', label: '本机' }
                ]}
              />
            </>
          )}
          <Tooltip title={func.builtIn ? '内置函数不可禁用' : undefined}>
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
        <Tooltip title={`已定义 ${shellsWithBody} 个 Shell 实现`}>
          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
            [{shellsWithBody} shell{shellsWithBody !== 1 ? 's' : ''}]
          </Text>
        </Tooltip>
      </ItemRow>

      <FunctionFormModal
        open={editOpen}
        title={func.builtIn ? `查看内置函数: ${func.name}` : `编辑函数: ${func.name}`}
        initialValues={{
          name: func.name,
          category: func.category,
          description: func.description || '',
          body: { ...func.body },
          localOnly: func.localOnly ?? false
        }}
        okText="保存"
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
