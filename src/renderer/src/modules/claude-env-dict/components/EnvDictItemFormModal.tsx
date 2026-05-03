import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Switch, App } from 'antd'
import { useTranslation } from 'react-i18next'
import type { UserClaudeEnvDictItem, ClaudeEnvDictCategory } from '@shared/types/claude-env-dict'
import { isValidEnvVarKey } from '@shared/types/claude-env-dict'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'

interface Props {
  open: boolean
  initial: UserClaudeEnvDictItem | null
  onCancel: () => void
  onOk: (item: UserClaudeEnvDictItem) => void
}

const CATEGORY_OPTIONS: ClaudeEnvDictCategory[] = ['model', 'thinking', 'request', 'privacy', 'cache', 'custom']

export function EnvDictItemFormModal({ open, initial, onCancel, onOk }: Props): React.ReactElement {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const items = useClaudeEnvDictStore((s) => s.items)

  const [form, setForm] = useState<UserClaudeEnvDictItem>({
    key: '',
    category: 'custom',
    defaultInTemplate: false,
    exampleValue: '',
    description: ''
  })

  useEffect(() => {
    if (open) {
      setForm(initial ?? {
        key: '',
        category: 'custom',
        defaultInTemplate: false,
        exampleValue: '',
        description: ''
      })
    }
  }, [open, initial])

  const isEditing = initial !== null
  const trimmedKey = form.key.trim()

  const handleOk = () => {
    if (!trimmedKey) return
    if (!isValidEnvVarKey(trimmedKey)) {
      message.error(t('claudeEnvDict.invalidKey'))
      return
    }
    if (!isEditing) {
      const conflict = items.find((i) => i.key === trimmedKey)
      if (conflict) {
        message.error(conflict.builtIn
          ? t('claudeEnvDict.keyConflictBuiltIn')
          : t('claudeEnvDict.keyConflictUser'))
        return
      }
    }
    onOk({ ...form, key: trimmedKey })
  }

  return (
    <Modal
      title={isEditing ? t('claudeEnvDict.editCustom') : t('claudeEnvDict.addCustom')}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !trimmedKey }}
      width={520}
    >
      <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} colon={false} style={{ marginTop: 16 }}>
        <Form.Item label={t('claudeEnvDict.variableName')} required>
          <Input
            value={form.key}
            disabled={isEditing}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="MY_CUSTOM_VAR"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Form.Item label={t('claudeEnvDict.category')}>
          <Select
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={CATEGORY_OPTIONS.map((c) => ({
              value: c,
              label: t(`claudeEnvDict.categories.${c}`)
            }))}
          />
        </Form.Item>
        <Form.Item label={t('claudeEnvDict.exampleValue')}>
          <Input
            value={form.exampleValue ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, exampleValue: e.target.value }))}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Form.Item label={t('claudeEnvDict.descriptionLabel')}>
          <Input.TextArea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
        </Form.Item>
        <Form.Item label={t('claudeEnvDict.defaultInTemplate')}>
          <Switch
            checked={form.defaultInTemplate}
            onChange={(checked) => setForm((f) => ({ ...f, defaultInTemplate: checked }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
