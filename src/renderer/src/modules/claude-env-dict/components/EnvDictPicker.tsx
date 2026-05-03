import { useMemo, useState } from 'react'
import { Modal, Input, Checkbox, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import type { ClaudeEnvDictItem } from '@shared/types/claude-env-dict'

const { Text } = Typography

function describe(item: ClaudeEnvDictItem, t: (k: string) => string): string {
  return item.description.type === 'i18n' ? t(item.description.key) : item.description.text
}

export function EnvDictPicker({
  open,
  excludeKeys,
  onCancel,
  onOk
}: {
  open: boolean
  excludeKeys: string[]
  onCancel: () => void
  onOk: (keys: string[]) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const items = useClaudeEnvDictStore((s) => s.items)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const excludeSet = useMemo(() => new Set(excludeKeys), [excludeKeys])

  const handleAfterOpen = (visible: boolean) => {
    if (visible) {
      setSelected(new Set())
      setSearch('')
    }
  }

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return items
      .filter((i) => !excludeSet.has(i.key))
      .filter((i) => {
        if (!lower) return true
        return i.key.toLowerCase().includes(lower) || describe(i, t).toLowerCase().includes(lower)
      })
  }, [items, excludeSet, search, t])

  const grouped = useMemo(() => {
    const map = new Map<string, ClaudeEnvDictItem[]>()
    for (const i of filtered) {
      const arr = map.get(i.category) ?? []
      arr.push(i)
      map.set(i.category, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const toggle = (key: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Modal
      title={t('claudeEnvDict.pickerTitle')}
      open={open}
      afterOpenChange={handleAfterOpen}
      onCancel={onCancel}
      onOk={() => onOk(Array.from(selected))}
      okText={t('claudeEnvDict.pickerOk')}
      okButtonProps={{ disabled: selected.size === 0 }}
      cancelText={t('common.cancel')}
      width={640}
    >
      <Input.Search
        placeholder={t('claudeEnvDict.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {grouped.map(([category, list]) => (
          <div key={category} style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t(`claudeEnvDict.categories.${category}`)}
            </Text>
            <div style={{ marginTop: 4 }}>
              {list.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '6px 4px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggle(item.key)}
                >
                  <Checkbox checked={selected.has(item.key)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Text code style={{ fontSize: 12 }}>{item.key}</Text>
                      {item.builtIn ? (
                        <Tag color="blue" style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>
                          {t('claudeEnvDict.builtInLabel')}
                        </Tag>
                      ) : (
                        <Tag color="green" style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>
                          {t('claudeEnvDict.customLabel')}
                        </Tag>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {describe(item, t)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
