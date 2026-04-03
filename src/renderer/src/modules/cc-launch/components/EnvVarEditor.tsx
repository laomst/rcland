import { Input, Switch, Typography } from 'antd'
import type { EnvVarsMap, EnvVarSetting } from '@shared/types'
import { CLAUDE_ENV_VAR_KEYS, CLAUDE_ENV_VAR_LABELS } from '@shared/types'

const { Text } = Typography

export function EnvVarEditor({
  envVars,
  onChange
}: {
  envVars: EnvVarsMap
  onChange: (key: string, setting: EnvVarSetting) => void
}): React.ReactElement {
  return (
    <div>
      {CLAUDE_ENV_VAR_KEYS.map((key) => {
        const setting = envVars[key]
        if (!setting) return null
        return (
          <div
            key={key}
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
            <Text code style={{ fontSize: 11, width: 280, flexShrink: 0, color: setting.enabled ? undefined : '#999' }}>
              {key}
            </Text>
            <Input
              size="small"
              value={setting.value}
              placeholder={CLAUDE_ENV_VAR_LABELS[key]}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              disabled={!setting.enabled}
              onChange={(e) => onChange(key, { ...setting, value: e.target.value })}
            />
            <Switch
              size="small"
              checked={setting.enabled}
              onChange={(checked) => onChange(key, { ...setting, enabled: checked })}
            />
          </div>
        )
      })}
    </div>
  )
}
