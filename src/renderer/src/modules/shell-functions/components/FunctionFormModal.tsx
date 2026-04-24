import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, Form, Select, Tabs, Switch, Space, Typography, message } from 'antd'
import { SHELL_LABELS, ALL_SHELL_TYPES, type ShellType } from '@shared/shell'
import type { ShellFunction } from '@shared/shell-types'

const { TextArea } = Input

/**
 * 从 shell 函数代码中提取函数名
 * 支持格式:
 *   function name() {    function name() \n {
 *   function name {      name() {    name() \n {
 * 跳过注释行
 */
function extractFunctionName(code: string): string | null {
  if (!code?.trim()) return null

  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // function name() ... 或 function name ...（不带括号，bash/zsh 合法语法）
    const funcMatch = trimmed.match(/^function\s+([\w-]+)/)
    if (funcMatch) return funcMatch[1]

    // name() ... 格式（花括号可能在本行或下一行，不要求必须在同行）
    const nameMatch = trimmed.match(/^([\w-]+)\s*\(\s*\)/)
    if (nameMatch) return nameMatch[1]
  }

  return null
}

const { Text } = Typography

interface FormValues {
  name: string
  category: string
  description: string
  body: ShellFunction['body']
  funcNames?: ShellFunction['funcNames']
  localOnly: boolean
}

interface FunctionFormModalProps {
  open: boolean
  title: string
  initialValues: FormValues
  okText: string
  okDisabled?: boolean
  readOnly?: boolean
  onCancel: () => void
  onOk: (values: FormValues) => void
}

/** Component for editing function body */
function FunctionBodyEditor({
  shell,
  value,
  extractedName,
  readOnly,
  onChange
}: {
  shell: ShellType
  value: string
  extractedName: string | null
  readOnly?: boolean
  onChange: (value: string) => void
}): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div style={{ paddingTop: 8 }}>
      {!readOnly && (
        <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
          {t('shellFunctions.codePlaceholder', { shell: SHELL_LABELS[shell] })}
        </div>
      )}
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`myfunc() {\n  echo "Hello"\n}`}
        autoSize={{ minRows: 8, maxRows: 20 }}
        readOnly={readOnly}
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          backgroundColor: readOnly ? '#f5f5f5' : '#fafafa'
        }}
      />
      {!readOnly && value && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          {extractedName ? (
            <span style={{ color: '#52c41a' }}>{t('shellFunctions.nameDetected', { name: extractedName })}</span>
          ) : (
            <span style={{ color: '#ff4d4f' }}>{t('shellFunctions.nameNotDetected')}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function FunctionFormModal({
  open,
  title,
  initialValues,
  okText,
  okDisabled,
  readOnly,
  onCancel,
  onOk
}: FunctionFormModalProps): React.ReactElement {
  const { t } = useTranslation()

  const userCategoryOptions = [
    { value: 'git', label: 'Git' },
    { value: 'filesystem', label: t('shellFunctions.categories.filesystem') },
    { value: 'network', label: t('shellFunctions.categories.network') },
    { value: 'dev', label: t('shellFunctions.categories.dev') },
    { value: 'system', label: t('shellFunctions.categories.system') },
    { value: 'archive', label: t('shellFunctions.categories.archive') },
    { value: 'search', label: t('shellFunctions.categories.search') },
    { value: 'process', label: t('shellFunctions.categories.process') },
    { value: 'custom', label: t('shellFunctions.categories.custom') },
  ]
  const builtinCategoryOption = { value: 'builtin', label: t('shellFunctions.categories.builtin') }

  const [form, setForm] = useState<FormValues>(initialValues)
  const [extractedNames, setExtractedNames] = useState<Map<ShellType, string | null>>(new Map())

  // Reset form when modal opens with new initial values
  useEffect(() => {
    if (open) {
      setForm(initialValues)
      // 提取初始的函数名
      const names = new Map<ShellType, string | null>()
      for (const shell of ALL_SHELL_TYPES) {
        const code = initialValues.body[shell]
        if (code) {
          names.set(shell, extractFunctionName(code))
        }
      }
      setExtractedNames(names)
    }
  }, [open, initialValues])

  const handleBodyChange = (shell: ShellType, value: string) => {
    setForm((f) => ({
      ...f,
      body: { ...f.body, [shell]: value }
    }))
    // 提取函数名
    setExtractedNames((prev) => {
      const next = new Map(prev)
      next.set(shell, extractFunctionName(value))
      return next
    })
  }

  const handleOk = () => {
    // 提取每个 shell 的函数名
    const funcNames: ShellFunction['funcNames'] = {}
    let hasError = false

    for (const shell of ALL_SHELL_TYPES) {
      const code = form.body[shell]?.trim()
      if (!code) continue

      const name = extractFunctionName(code)
      if (!name) {
        message.error(t('shellFunctions.codeFormatError', { shell: SHELL_LABELS[shell] }))
        hasError = true
      } else {
        funcNames[shell] = name
      }
    }

    if (hasError) return

    // 如果没有填写任何函数代码
    if (Object.keys(funcNames).length === 0) {
      message.error(t('shellFunctions.noCodeError'))
      return
    }

    // Filter empty body entries and save
    const cleanedBody: ShellFunction['body'] = {}
    for (const shell of ALL_SHELL_TYPES) {
      const content = form.body[shell]?.trim()
      if (content) {
        cleanedBody[shell] = content
      }
    }

    onOk({ ...form, body: cleanedBody, funcNames })
  }

  // Generate tab items for each shell type
  const tabItems = ALL_SHELL_TYPES.map((shell) => ({
    key: shell,
    label: SHELL_LABELS[shell],
    children: (
      <FunctionBodyEditor
        shell={shell}
        value={form.body[shell] || ''}
        extractedName={extractedNames.get(shell) ?? null}
        readOnly={readOnly}
        onChange={(value) => handleBodyChange(shell, value)}
      />
    )
  }))

  return (
    <Modal
      title={title}
      open={open}
      onOk={readOnly ? onCancel : handleOk}
      onCancel={onCancel}
      okText={readOnly ? t('common.close') : okText}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: okDisabled }}
      cancelButtonProps={readOnly ? { style: { display: 'none' } } : undefined}
      width={720}
      destroyOnClose
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('shellFunctions.identifierName')} extra={readOnly ? undefined : t('shellFunctions.identifierNameHint')}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('shellFunctions.identifierNamePlaceholder')}
            disabled={readOnly}
          />
        </Form.Item>

        <Form.Item label={t('shellFunctions.category')}>
          <Select
            value={form.category}
            onChange={(val) => setForm((f) => ({ ...f, category: val }))}
            options={readOnly && form.category === 'builtin'
              ? [builtinCategoryOption]
              : userCategoryOptions}
            style={{ width: '100%' }}
            disabled={readOnly}
          />
        </Form.Item>

        <Form.Item label={t('common.description')}>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('shellFunctions.descriptionPlaceholder')}
            disabled={readOnly}
          />
        </Form.Item>

        {!readOnly && (
          <Form.Item label={t('common.localOnly')}>
            <Space>
              <Switch
                checked={form.localOnly}
                onChange={(checked) => setForm((f) => ({ ...f, localOnly: checked }))}
              />
              {form.localOnly && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('common.localOnlyHint')}
                </Text>
              )}
            </Space>
          </Form.Item>
        )}

        <Form.Item label={t('shellFunctions.functionCode')} style={{ marginBottom: 0 }}>
          <div style={{ marginTop: 4 }}>
            <Tabs
              defaultActiveKey="zsh"
              items={tabItems}
              size="small"
              style={{ marginBottom: 0 }}
            />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}
