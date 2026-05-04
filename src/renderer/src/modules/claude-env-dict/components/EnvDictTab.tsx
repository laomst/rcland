import { useState, useMemo } from 'react'
import { Input, Button, Switch, Tag, Tooltip, Typography, App, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import type { ClaudeEnvDictItem, UserClaudeEnvDictItem } from '@shared/types/claude-env-dict'
import { EnvDictItemFormModal } from './EnvDictItemFormModal'

const { Text } = Typography

function describe(item: ClaudeEnvDictItem, t: (k: string) => string): string {
  return item.description.type === 'i18n' ? t(item.description.key) : item.description.text
}

export function EnvDictTab(): React.ReactElement {
  const { t } = useTranslation()
  const { modal, message } = App.useApp()
  const items = useClaudeEnvDictStore((s) => s.items)
  const setBuiltInOverride = useClaudeEnvDictStore((s) => s.setBuiltInOverride)
  const addUserItem = useClaudeEnvDictStore((s) => s.addUserItem)
  const updateUserItem = useClaudeEnvDictStore((s) => s.updateUserItem)
  const deleteUserItem = useClaudeEnvDictStore((s) => s.deleteUserItem)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserClaudeEnvDictItem | null>(null)

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return lower
      ? items.filter((i) =>
          i.key.toLowerCase().includes(lower) || describe(i, t).toLowerCase().includes(lower)
        )
      : items
  }, [items, search, t])

  const grouped = useMemo(() => {
    const map = new Map<string, ClaudeEnvDictItem[]>()
    for (const i of filtered) {
      const arr = map.get(i.category) ?? []
      arr.push(i)
      map.set(i.category, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const handleToggleDefault = async (item: ClaudeEnvDictItem, value: boolean) => {
    try {
      if (item.builtIn) {
        await setBuiltInOverride(item.key, { defaultInTemplate: value })
      } else {
        await updateUserItem({
          key: item.key,
          category: item.category,
          defaultInTemplate: value,
          exampleValue: item.exampleValue,
          description: item.description.type === 'plain' ? item.description.text : ''
        })
      }
    } catch (e) {
      message.error(t('common.operationFailed', { error: String(e) }))
    }
  }

  const handleEdit = (item: ClaudeEnvDictItem) => {
    if (item.builtIn) return
    setEditing({
      key: item.key,
      category: item.category,
      defaultInTemplate: item.defaultInTemplate,
      exampleValue: item.exampleValue,
      description: item.description.type === 'plain' ? item.description.text : ''
    })
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleFormOk = async (item: UserClaudeEnvDictItem) => {
    try {
      if (editing) await updateUserItem(item)
      else await addUserItem(item)
      setFormOpen(false)
    } catch (e) {
      message.error(t('common.operationFailed', { error: String(e) }))
    }
  }

  const handleDelete = (item: ClaudeEnvDictItem) => {
    if (item.builtIn) return
    modal.confirm({
      title: t('common.confirmDelete'),
      content: t('claudeEnvDict.deleteCustomConfirm', { key: item.key }),
      okType: 'danger',
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteUserItem(item.key)
        } catch (e) {
          message.error(t('common.operationFailed', { error: String(e) }))
        }
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder={t('claudeEnvDict.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('claudeEnvDict.addCustom')}
        </Button>
      </div>

      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('claudeEnvDict.builtInReadOnlyHint')}
      </Text>

      <div style={{ marginTop: 12 }}>
        {grouped.length === 0 && <Empty />}
        {grouped.map(([category, list]) => (
          <div key={category} style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13 }}>
              {t(`claudeEnvDict.categories.${category}`)}
            </Text>
            <div style={{ marginTop: 6 }}>
              {list.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr auto auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '8px 4px',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div>
                    <Text code style={{ fontSize: 12 }}>{item.key}</Text>
                    <div style={{ marginTop: 2 }}>
                      {item.builtIn ? (
                        <Tag color="blue" style={{ fontSize: 10 }}>
                          <LockOutlined /> {t('claudeEnvDict.builtInLabel')}
                        </Tag>
                      ) : (
                        <Tag color="green" style={{ fontSize: 10 }}>
                          {t('claudeEnvDict.customLabel')}
                        </Tag>
                      )}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Tooltip title={describe(item, t)}>
                      <Text style={{ fontSize: 12, color: '#666', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {describe(item, t)}
                      </Text>
                    </Tooltip>
                    {item.exampleValue && (
                      <Tooltip title={item.exampleValue}>
                        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.exampleValue}
                        </Text>
                      </Tooltip>
                    )}
                  </div>
                  <div>
                    <Tooltip title={t('claudeEnvDict.defaultInTemplate')}>
                      <Switch
                        size="small"
                        checked={item.defaultInTemplate}
                        onChange={(v) => handleToggleDefault(item, v)}
                      />
                    </Tooltip>
                  </div>
                  <div>
                    {!item.builtIn && (
                      <>
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)} />
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <EnvDictItemFormModal
        open={formOpen}
        initial={editing}
        onCancel={() => setFormOpen(false)}
        onOk={handleFormOk}
      />
    </div>
  )
}
