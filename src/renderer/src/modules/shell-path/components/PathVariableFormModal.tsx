import { Input, Modal, Form, Switch, Typography, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useFormModal } from '@renderer/hooks/useFormModal'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { VariableRefInput } from '@renderer/components/VariableRefInput'

const { Text } = Typography

export interface PathVariableFormValues {
  key: string
  value: string
  description: string
  localOnly: boolean
}

interface PathVariableFormModalProps {
  open: boolean
  title: string
  initialValues: PathVariableFormValues
  okText: string
  okDisabled?: boolean
  isEdit?: boolean
  onCancel: () => void
  onOk: (values: PathVariableFormValues) => void
}

const INITIAL_STATE: PathVariableFormValues = {
  key: '',
  value: '',
  description: '',
  localOnly: false
}

export function PathVariableFormModal({
  open,
  title,
  initialValues,
  okText,
  okDisabled,
  isEdit,
  onCancel,
  onOk
}: PathVariableFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const pathVariables = useShellConfigStore((s) => s.shellConfig.pathVariables)
  const { formState, setField } = useFormModal<PathVariableFormValues>({
    initialState: INITIAL_STATE,
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
      width={480}
    >
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} labelAlign="left" colon={false} style={{ marginTop: 16 }}>
        <Form.Item label={t('shellEnv.varName')} required>
          <Input
            value={formState.key}
            onChange={(e) => setField('key', e.target.value)}
            placeholder="HOME"
            style={{ fontFamily: 'monospace' }}
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item label={t('shellEnv.varValue')} required>
          <VariableRefInput
            value={formState.value}
            onChange={(val) => setField('value', val)}
            variables={pathVariables}
            placeholder="/Users/username"
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
      </Form>
    </Modal>
  )
}
