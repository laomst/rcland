import { Input, Modal, Form, Switch, Checkbox, Typography, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { LockOutlined } from '@ant-design/icons'
import type { ShellType } from '@shared/shell'
import { ALL_SHELL_TYPES, SHELL_LABELS } from '@shared/shell'
import { useFormModal } from '@renderer/hooks/useFormModal'
import { VariableRefInput } from '@renderer/components/VariableRefInput'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'

const { Text } = Typography

export interface EnvVarFormValues {
  key: string
  value: string
  encrypted: boolean
  description: string
  shells: ShellType[]
  localOnly: boolean
}

interface EnvVarFormModalProps {
  open: boolean
  title: string
  initialValues: EnvVarFormValues
  okText: string
  okDisabled?: boolean
  isEdit?: boolean
  onCancel: () => void
  onOk: (values: EnvVarFormValues) => void
}

const ENVVAR_INITIAL_STATE: EnvVarFormValues = {
  key: '',
  value: '',
  encrypted: false,
  description: '',
  shells: [...ALL_SHELL_TYPES],
  localOnly: false
}

export function EnvVarFormModal({
  open,
  title,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk
}: EnvVarFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const variables = useShellConfigStore((s) => s.shellConfig.variables)
  const { formState, setField, toggleShell } = useFormModal({
    initialState: ENVVAR_INITIAL_STATE,
    editingValues: open ? initialValues : undefined,
    open
  })

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => onOk(formState)}
      onCancel={onCancel}
      okText={okText}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: okDisabled ?? !formState.key.trim() }}
      width={560}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('shellEnv.varName')} required>
          <Input
            value={formState.key}
            onChange={(e) => setField('key', e.target.value)}
            placeholder={t('shellEnv.varNamePlaceholder')}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Form.Item label={t('shellEnv.varValue')} required>
          <VariableRefInput
            value={formState.value}
            onChange={(val) => setField('value', val)}
            variables={variables}
            password={formState.encrypted}
            placeholder={formState.encrypted ? t('shellEnv.encryptedPlaceholder') : t('shellEnv.valuePlaceholder')}
          />
        </Form.Item>
        <Form.Item label={t('shellEnv.encryptStorage')}>
          <Space>
            <Switch
              checked={formState.encrypted}
              onChange={(checked) => setField('encrypted', checked)}
            />
            {formState.encrypted && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <LockOutlined style={{ marginRight: 4 }} />
                {t('shellEnv.encryptStorageHint')}
              </Text>
            )}
          </Space>
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
          <Space size={8}>
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
