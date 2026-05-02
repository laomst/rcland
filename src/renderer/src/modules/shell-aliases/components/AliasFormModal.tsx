import { Input, Modal, Form, Checkbox, Space, Typography, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ShellType } from '@shared/shell'
import { SHELL_LABELS, ALL_SHELL_TYPES } from '@shared/shell'
import { useFormModal } from '@renderer/hooks/useFormModal'

const { TextArea } = Input
const { Text } = Typography

export interface AliasFormValues {
  alias: string
  command: string
  description: string
  shells: ShellType[]
  localOnly: boolean
}

interface AliasFormModalProps {
  open: boolean
  title: string
  isEdit?: boolean
  initialValues: AliasFormValues
  okText: string
  okDisabled?: boolean
  onCancel: () => void
  onOk: (values: AliasFormValues) => void
}

const ALIAS_INITIAL_STATE: AliasFormValues = {
  alias: '',
  command: '',
  description: '',
  shells: [...ALL_SHELL_TYPES],
  localOnly: false
}

export function AliasFormModal({
  open,
  title,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk
}: AliasFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const { formState, setField, toggleShell } = useFormModal({
    initialState: ALIAS_INITIAL_STATE,
    editingValues: open ? initialValues : undefined,
    open
  })

  const isValid = formState.alias.trim() && formState.command.trim()

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => onOk(formState)}
      onCancel={onCancel}
      okText={okText}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: okDisabled ?? !isValid }}
      width={560}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('shellAliases.aliasLabel')} required>
          <Input
            value={formState.alias}
            onChange={(e) => setField('alias', e.target.value)}
            placeholder={t('shellAliases.aliasPlaceholder')}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item label={t('shellAliases.commandLabel')} required>
          <TextArea
            value={formState.command}
            onChange={(e) => setField('command', e.target.value)}
            placeholder={t('shellAliases.commandPlaceholder')}
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item label={t('common.description')}>
          <Input
            value={formState.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder={t('common.descriptionPlaceholder')}
          />
        </Form.Item>

        <Form.Item label={t('common.localOnly')}>
          <Space>
            <Switch
              checked={formState.localOnly}
              onChange={(checked) => setField('localOnly', checked)}
            />
            {formState.localOnly && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('common.localOnlyHint')}
              </Text>
            )}
          </Space>
        </Form.Item>

        <Form.Item label={t('common.applicableShells')}>
          <Space size={12}>
            {ALL_SHELL_TYPES.map((shell) => (
              <Checkbox
                key={shell}
                checked={formState.shells.includes(shell)}
                onChange={() => toggleShell(shell)}
              >
                {SHELL_LABELS[shell]}
              </Checkbox>
            ))}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
