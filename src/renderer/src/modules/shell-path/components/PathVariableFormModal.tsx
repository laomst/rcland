import { Input, Modal, Form, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useFormModal } from '@renderer/hooks/useFormModal'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'
import { VariableRefInput } from '@renderer/components/VariableRefInput'

export interface PathVariableFormValues {
  key: string
  value: string
  description: string
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
  description: ''
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
  const allPathVariables = useShellConfigStore((s) => s.shellConfig.pathVariables)
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
            variables={allPathVariables}
            placeholder="/Users/username"
            addonAfter={
              <Button
                icon={<FolderOpenOutlined />}
                onClick={async () => {
                  const selected = await window.electronAPI.showOpenDialog({
                    title: t('shellPath.selectDir'),
                    properties: ['openDirectory']
                  })
                  if (selected) {
                    setField('value', selected)
                  }
                }}
              />
            }
          />
        </Form.Item>
        <Form.Item label={t('common.description')}>
          <Input
            value={formState.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder={t('common.descriptionPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
