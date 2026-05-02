import { Input, Modal, Form, Checkbox, Typography, Space, Switch, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { FolderOpenOutlined } from '@ant-design/icons'
import type { ShellType } from '@shared/shell'
import { ALL_SHELL_TYPES, SHELL_LABELS, getOsSupportedShells } from '@shared/shell'
import { useFormModal } from '@renderer/hooks/useFormModal'
import { VariableRefInput } from '@renderer/components/VariableRefInput'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'

const { Text } = Typography

export interface PathFormValues {
  path: string
  description: string
  shells: ShellType[]
  localOnly: boolean
}

interface PathFormModalProps {
  open: boolean
  title: string
  initialValues: PathFormValues
  okText: string
  okDisabled?: boolean
  isEdit?: boolean
  onCancel: () => void
  onOk: (values: PathFormValues) => void
}

const PATH_INITIAL_STATE: PathFormValues = {
  path: '',
  description: '',
  shells: [...ALL_SHELL_TYPES],
  localOnly: false
}

export function PathFormModal({
  open,
  title,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk
}: PathFormModalProps): React.ReactElement {
  const { t } = useTranslation()
  const pathVariables = useShellConfigStore((s) => s.shellConfig.pathVariables)
  const { formState, setField, toggleShell } = useFormModal({
    initialState: PATH_INITIAL_STATE,
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
      okButtonProps={{ disabled: okDisabled ?? !formState.path.trim() }}
      width={560}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item label={t('shellPath.pathLabel')} required>
          <VariableRefInput
            value={formState.path}
            onChange={(val) => setField('path', val)}
            variables={pathVariables}
            placeholder={t('shellPath.pathPlaceholder')}
            addonAfter={
              <Button
                icon={<FolderOpenOutlined />}
                onClick={async () => {
                  const selected = await window.electronAPI.showOpenDialog({
                    title: t('shellPath.selectDir'),
                    properties: ['openDirectory']
                  })
                  if (selected) {
                    setField('path', selected)
                  }
                }}
              />
            }
          />
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {t('shellPath.pathHint')}
          </Text>
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
        <Form.Item label={t('common.applicableShells')} extra={t('shellPath.pathShellHint')}>
          <Space size={8}>
            {getOsSupportedShells().map((shell) => (
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
