import { useEffect, useState } from 'react'
import { Button, Empty, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyFunction } from '@shared/builtin-functions'
import type { ShellFunction } from '@shared/shell-types'
import { FunctionCard } from '../components/FunctionCard'
import { FunctionFormModal } from '../components/FunctionFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title, Text } = Typography

/** 提取函数名 */
function extractFunctionName(code: string): string | null {
  if (!code?.trim()) return null
  const patterns = [
    /^\s*function\s+(\w+)\s*\(\s*\)\s*\{/,
    /^\s*(\w+)\s*\(\s*\)\s*\{/,
    /(\w+)\s*\(\s*\)\s*\{/,
  ]
  for (const pattern of patterns) {
    const match = code.match(pattern)
    if (match && match[1]) return match[1]
  }
  return null
}

/** 从代码中提取所有 shell 的函数名 */
function extractFuncNames(body: ShellFunction['body']): ShellFunction['funcNames'] {
  const funcNames: ShellFunction['funcNames'] = {}
  for (const shell of ['zsh', 'bash', 'powershell'] as const) {
    const code = body[shell]
    if (code) {
      const name = extractFunctionName(code)
      if (name) funcNames[shell] = name
    }
  }
  return funcNames
}

export default function FunctionPage(): React.ReactElement {
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const functions = useShellConfigStore((s) => s.shellConfig.functions)
  const reorderFunctions = useShellConfigStore((s) => s.reorderFunctions)
  const addFunction = useShellConfigStore((s) => s.addFunction)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingFuncId, setEditingFuncId] = useState<string | null>(null)
  const [initialFormValues, setInitialFormValues] = useState<{
    name: string
    category: string
    description: string
    body: ShellFunction['body']
    localOnly: boolean
  }>({
    name: '',
    category: 'custom',
    description: '',
    body: {},
    localOnly: false
  })

  useEffect(() => {
    if (!dataLoaded) {
      loadShellConfig()
    }
  }, [dataLoaded, loadShellConfig])

  // 内置函数固定在顶部，用户函数按同步/本机分组
  const builtInFunctions = functions.filter((f) => f.builtIn)
  const userFunctions = functions.filter((f) => !f.builtIn)

  const { sensors, handleDragEnd, syncItems: syncedFunctions, localItems: localFunctions } = useSortableList(
    userFunctions,
    reorderFunctions
  )

  // 添加空白函数
  const handleAdd = () => {
    const newFunc = createEmptyFunction()
    newFunc.order = functions.length
    addFunction(newFunc)
    setEditingFuncId(newFunc.id)
    setInitialFormValues({
      name: '',
      category: 'custom',
      description: '',
      body: {},
      localOnly: false
    })
    setAddModalOpen(true)
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Shell 函数
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加函数
        </Button>
      </div>

      {/* 内置函数区域（固定，不可拖拽） */}
      {builtInFunctions.map((func, idx) => (
        <FunctionCard key={func.id} func={func} index={idx + 1} />
      ))}

      {/* 用户函数区域 */}
      {syncedFunctions.length === 0 && localFunctions.length === 0 && builtInFunctions.length === 0 ? (
        <Empty
          description="暂无函数定义"
          style={{ marginTop: 48 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加第一个函数
          </Button>
        </Empty>
      ) : (
        <>
          {/* 同步函数 */}
          {syncedFunctions.length > 0 && (
            <>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                同步配置 ({syncedFunctions.length})
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={syncedFunctions.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {syncedFunctions.map((func, idx) => (
                    <SortableWrapper key={func.id} id={func.id}>
                      {(dragHandleProps) => (
                        <FunctionCard
                          func={func}
                          index={builtInFunctions.length + idx + 1}
                          dragHandleProps={dragHandleProps as any}
                        />
                      )}
                    </SortableWrapper>
                  ))}
                </SortableContext>
              </DndContext>
            </>
          )}

          {/* 本机函数 */}
          {localFunctions.length > 0 && (
            <>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: syncedFunctions.length > 0 ? 16 : 0, marginBottom: 8 }}>
                本机配置 ({localFunctions.length})
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localFunctions.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {localFunctions.map((func, idx) => (
                    <SortableWrapper key={func.id} id={func.id}>
                      {(dragHandleProps) => (
                        <FunctionCard
                          func={func}
                          index={builtInFunctions.length + syncedFunctions.length + idx + 1}
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
      )}

      {/* Add/Edit Modal */}
      <FunctionFormModal
        open={addModalOpen}
        title={editingFuncId && functions.find(f => f.id === editingFuncId)?.name ? "编辑函数" : "添加函数"}
        initialValues={initialFormValues}
        okText="保存"
        onCancel={() => {
          // 如果是新建且没有填写名称，删除空白函数
          const editingFunc = editingFuncId ? functions.find(f => f.id === editingFuncId) : null
          if (editingFunc && !editingFunc.name) {
            useShellConfigStore.getState().removeFunction(editingFunc.id)
          }
          setEditingFuncId(null)
          setAddModalOpen(false)
        }}
        onOk={(values) => {
          if (editingFuncId) {
            // 提取函数名
            const funcNames = extractFuncNames(values.body)
            useShellConfigStore.getState().updateFunction(editingFuncId, {
              name: values.name,
              category: values.category,
              description: values.description,
              body: values.body,
              funcNames,
              localOnly: values.localOnly
            })
          }
          setEditingFuncId(null)
          setAddModalOpen(false)
        }}
      />

    </div>
  )
}
