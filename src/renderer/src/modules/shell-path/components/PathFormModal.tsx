import { Input, Modal, Form, Checkbox, Typography, Space, Switch, Button } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import type { ShellType } from '@shared/shell'
import { ALL_SHELL_TYPES, SHELL_LABELS, getOsSupportedShells } from '@shared/shell'
import { useFormModal } from '@renderer/hooks/useFormModal'

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
      cancelText="取消"
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
        <Form.Item label="路径" required>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={formState.path}
              onChange={(e) => setField('path', e.target.value)}
              placeholder="如: /usr/local/bin 或 $HOME/.local/bin"
              style={{ fontFamily: 'monospace' }}
            />
            <Button
              icon={<FolderOpenOutlined />}
              onClick={async () => {
                const selected = await window.electronAPI.showOpenDialog({
                  title: '选择目录',
                  properties: ['openDirectory']
                })
                if (selected) {
                  setField('path', selected)
                }
              }}
            />
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {`支持手动输入或选择目录，可使用 $VAR 或 \${VAR} 形式的变量引用`}
          </Text>
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
        <Form.Item label="适用 Shell" extra="PATH 路径格式与操作系统相关，仅显示当前系统支持的 Shell">
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
