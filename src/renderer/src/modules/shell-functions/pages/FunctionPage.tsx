import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { createEmptyFunction } from '@shared/builtin-functions'
import type { ShellFunction } from '@shared/shell-types'
import { FunctionCard } from '../components/FunctionCard'
import { FunctionFormModal } from '../components/FunctionFormModal'
import { SortableWrapper } from '@renderer/components/SortableWrapper'
import { GroupHeader } from '@renderer/components/GroupHeader'
import { useSortableList } from '@renderer/hooks/useSortableList'

const { Title } = Typography

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
  const { t } = useTranslation()
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)
  const dataLoaded = useShellConfigStore((s) => s.dataLoaded)
  const functions = useShellConfigStore((s) => s.shellConfig.functions)
  const reorderFunctions = useShellConfigStore((s) => s.reorderFunctions)
  const addFunction = useShellConfigStore((s) => s.addFunction)

  const [syncCollapsed, setSyncCollapsed] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
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

  const handleAdd = (localOnly: boolean) => {
    const newFunc = createEmptyFunction()
    newFunc.localOnly = localOnly
    addFunction(newFunc)
    setEditingFuncId(newFunc.id)
    setInitialFormValues({
      name: '',
      category: 'custom',
      description: '',
      body: {},
      localOnly
    })
    setAddModalOpen(true)
  }

  return (
    <div style={{ padding: 16 }}>
      <Title level={4} style={{ marginBottom: 16 }}>{t('shellFunctions.title')}</Title>

      {/* 内置函数区域（固定，不可拖拽） */}
      {builtInFunctions.map((func, idx) => (
        <FunctionCard key={func.id} func={func} index={idx + 1} />
      ))}

      {/* 用户函数区域 */}
      <GroupHeader
        title={t('common.syncedConfig')}
        count={syncedFunctions.length}
        collapsed={syncCollapsed}
        onToggle={() => setSyncCollapsed(!syncCollapsed)}
        onAdd={() => handleAdd(false)}
        style={builtInFunctions.length > 0 ? { marginTop: 16 } : undefined}
      />
      {!syncCollapsed && syncedFunctions.length > 0 && (
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
      )}

      <GroupHeader title={t('common.localConfig')} count={localFunctions.length} collapsed={localCollapsed} onToggle={() => setLocalCollapsed(!localCollapsed)} onAdd={() => handleAdd(true)} style={{ marginTop: 16 }} />
      {!localCollapsed && localFunctions.length > 0 && (
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
      )}

      {/* Add/Edit Modal */}
      <FunctionFormModal
        open={addModalOpen}
        title={editingFuncId && functions.find(f => f.id === editingFuncId)?.name ? t('shellFunctions.editTitle') : t('shellFunctions.addTitle')}
        initialValues={initialFormValues}
        okText={t('common.save')}
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
