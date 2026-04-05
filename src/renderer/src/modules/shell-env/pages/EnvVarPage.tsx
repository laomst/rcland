import { useState, useEffect } from 'react'
import { Button, Empty, Typography, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyVariable } from '@shared/builtin-functions'
import { ALL_SHELL_TYPES } from '@shared/shell'
import { EnvVarCard } from '../components/EnvVarCard'
import { EnvVarFormModal, type EnvVarFormValues } from '../components/EnvVarFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Text } = Typography

export function EnvVarPage(): React.ReactElement {
  const variables = useShellConfigStore((s) => s.shellConfig.variables)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const addVariable = useShellConfigStore((s) => s.addVariable)
  const reorderVariables = useShellConfigStore((s) => s.reorderVariables)

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

  const { sensors, handleDragEnd, syncItems: syncedVars, localItems: localVars } = useSortableList(
    variables,
    reorderVariables
  )

  // 添加空白变量
  const handleAdd = () => {
    const newVar = createEmptyVariable()
    addVariable({
      ...newVar,
      order: variables.length
    })
    setEditingVarId(newVar.id)
    setInitialFormValues({
      key: '',
      value: '',
      encrypted: false,
      description: '',
      shells: [...ALL_SHELL_TYPES],
      localOnly: false
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>环境变量</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>({variables.length} 个)</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加变量
        </Button>
      </div>

      {variables.length === 0
        ? <Empty description="暂无环境变量，点击右上角添加" />
        : (
          <>
            {syncedVars.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  同步配置 ({syncedVars.length})
                </Text>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={syncedVars.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                    {syncedVars.map((v, idx) => (
                      <SortableWrapper key={v.id} id={v.id}>
                        {(dragHandleProps) => (
                          <EnvVarCard
                            variable={v}
                            index={idx + 1}
                            dragHandleProps={dragHandleProps as any}
                          />
                        )}
                      </SortableWrapper>
                    ))}
                  </SortableContext>
                </DndContext>
              </>
            )}
            {localVars.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: syncedVars.length > 0 ? 16 : 0, marginBottom: 8 }}>
                  本机配置 ({localVars.length})
                </Text>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={localVars.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                    {localVars.map((v, idx) => (
                      <SortableWrapper key={v.id} id={v.id}>
                        {(dragHandleProps) => (
                          <EnvVarCard
                            variable={v}
                            index={syncedVars.length + idx + 1}
                            dragHandleProps={dragHandleProps as any}
                          />
                        )}
                      </SortableWrapper>
                    ))}
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )
      }

      <EnvVarFormModal
        open={addOpen}
        title={editingVarId && variables.find(v => v.id === editingVarId)?.key ? "编辑环境变量" : "新建环境变量"}
        initialValues={initialFormValues}
        okText="保存"
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
