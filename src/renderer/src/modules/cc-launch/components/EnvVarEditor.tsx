import { Input, Switch, Typography, Button, Space, Tooltip } from 'antd'
import { DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { EnvVarsMap, EnvVarSetting } from '@shared/types'
import type { ClaudeEnvDictItem } from '@shared/types/claude-env-dict'
import { useClaudeEnvDictStore } from '@renderer/stores/useClaudeEnvDictStore'
import { useTranslation } from 'react-i18next'
import { EnvDictPicker } from '@renderer/modules/claude-env-dict/components/EnvDictPicker'

const { Text } = Typography

function useDescriptionText(item: ClaudeEnvDictItem | undefined): string {
  const { t } = useTranslation()
  if (!item) return t('claudeEnvDict.unknownVariable')
  if (item.description.type === 'i18n') return t(item.description.key)
  return item.description.text
}

function EnvVarRow({
  envVarKey,
  setting,
  onChange,
  onRemove
}: {
  envVarKey: string
  setting: EnvVarSetting
  onChange: (setting: EnvVarSetting) => void
  onRemove: () => void
}): React.ReactElement {
  const item = useClaudeEnvDictStore((s) => s.getItem(envVarKey))
  const desc = useDescriptionText(item)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
        padding: '2px 0',
        background: setting.enabled ? '#fff' : '#f5f5f5',
        borderRadius: 4,
        opacity: setting.enabled ? 1 : 0.6
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: 290, flexShrink: 0 }}>
        <Text code style={{ fontSize: 11, color: setting.enabled ? undefined : '#999' }}>{envVarKey}</Text>
        <Tooltip title={desc}>
          <InfoCircleOutlined style={{ color: '#999', fontSize: 12, cursor: 'pointer' }} />
        </Tooltip>
      </span>
      <Input
        size="small"
        value={setting.value}
        placeholder={item?.exampleValue ?? desc}
        title={desc}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        disabled={!setting.enabled}
        onChange={(e) => onChange({ ...setting, value: e.target.value })}
      />
      <Switch
        size="small"
        checked={setting.enabled}
        onChange={(checked) => onChange({ ...setting, enabled: checked })}
      />
      <Button
        size="small"
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={onRemove}
      />
    </div>
  )
}

export function EnvVarEditor({
  envVars,
  onChange,
  onRemove,
  onAdd
}: {
  envVars: EnvVarsMap
  onChange: (key: string, setting: EnvVarSetting) => void
  onRemove: (key: string) => void
  onAdd: (keys: string[]) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)

  const existingKeys = Object.keys(envVars)

  const handlePickerOk = (keys: string[]) => {
    onAdd(keys)
    setPickerOpen(false)
  }

  return (
    <div>
      {existingKeys.map((key) => (
        <EnvVarRow
          key={key}
          envVarKey={key}
          setting={envVars[key]}
          onChange={(s) => onChange(key, s)}
          onRemove={() => onRemove(key)}
        />
      ))}
      <Space style={{ marginTop: 8 }}>
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setPickerOpen(true)}
        >
          {t('claudeEnvDict.pickerTitle')}
        </Button>
      </Space>
      <EnvDictPicker
        open={pickerOpen}
        excludeKeys={existingKeys}
        onCancel={() => setPickerOpen(false)}
        onOk={handlePickerOk}
      />
    </div>
  )
}
