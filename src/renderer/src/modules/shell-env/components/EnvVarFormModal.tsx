import { Input, Modal, Form, Switch, Checkbox, Typography, Space } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { ShellType } from '@shared/shell'
import { ALL_SHELL_TYPES, SHELL_LABELS } from '@shared/shell'
import { useFormModal } from '@renderer/hooks/useFormModal'

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
      cancelText="取消"
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
        <Form.Item label="变量名" required>
          <Input
            value={formState.key}
            onChange={(e) => setField('key', e.target.value)}
            placeholder="如: MY_API_KEY"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
        <Form.Item label="变量值" required>
          {formState.encrypted ? (
            <Input.Password
              value={formState.value}
              onChange={(e) => setField('value', e.target.value)}
              placeholder="输入加密值"
              style={{ fontFamily: 'monospace' }}
            />
          ) : (
            <Input
              value={formState.value}
              onChange={(e) => setField('value', e.target.value)}
              placeholder="输入变量值"
              style={{ fontFamily: 'monospace' }}
            />
          )}
        </Form.Item>
        <Form.Item label="加密存储">
          <Space>
            <Switch
              checked={formState.encrypted}
              onChange={(checked) => setField('encrypted', checked)}
            />
            {formState.encrypted && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <LockOutlined style={{ marginRight: 4 }} />
                值将被加密存储
              </Text>
            )}
          </Space>
        </Form.Item>
        <Form.Item label="描述">
          <Input
            value={formState.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="可选描述"
          />
        </Form.Item>
        <Form.Item label="仅本机">
          <Space>
            <Switch
              checked={formState.localOnly}
              onChange={(checked) => setField('localOnly', checked)}
            />
            {formState.localOnly && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                此配置仅保存在本机，不会同步到其他设备
              </Text>
            )}
          </Space>
        </Form.Item>
        <Form.Item label="适用 Shell">
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
