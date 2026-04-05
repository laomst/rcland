import { Input, Modal, Form, Checkbox, Space, Typography, Switch } from 'antd'
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
  isEdit = false,
  initialValues,
  okText,
  okDisabled,
  onCancel,
  onOk
}: AliasFormModalProps): React.ReactElement {
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
      cancelText="取消"
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
        <Form.Item label="别名" required>
          <Input
            value={formState.alias}
            onChange={(e) => setField('alias', e.target.value)}
            placeholder="如 ll, gs, dcu"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item label="命令" required>
          <TextArea
            value={formState.command}
            onChange={(e) => setField('command', e.target.value)}
            placeholder="如 ls -la, git status"
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ fontFamily: 'monospace' }}
          />
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
