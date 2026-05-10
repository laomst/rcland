import { Card, Form, Input, Switch, Space, Typography, Divider } from 'antd'
import { useTranslation } from 'react-i18next'
import type { BaseSelector, BaseLocalSelector } from './types'

const { Text } = Typography

interface SelectorTabProps {
  selector: BaseSelector
  onChange: (patch: Partial<BaseSelector>) => void
  i18nPrefix: 'ccLaunch' | 'cxLaunch'
  defaults: {
    funcName: string
    promptTitle: string
    localFuncName: string
    kanbanFuncName: string
  }
}

export function SelectorTab({
  selector,
  onChange,
  i18nPrefix,
  defaults
}: SelectorTabProps): React.ReactElement {
  const { t } = useTranslation()
  const ls: BaseLocalSelector = selector.localSelector ?? {
    enabled: false,
    funcName: defaults.localFuncName,
    aliasEnabled: true
  }

  const k = (key: string) => `${i18nPrefix}.selector.${key}`

  return (
    <Card>
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} labelAlign="left" colon={false} size="small">
        <Divider style={{ margin: '0 0 12px' }}>{t(k('mainSelector'))}</Divider>
        <Form.Item label={t(k('funcName'))}>
          <Input
            value={selector.funcName}
            onChange={(e) => onChange({ funcName: e.target.value })}
            placeholder={defaults.funcName}
          />
        </Form.Item>
        <Form.Item label={t(k('promptTitle'))}>
          <Input
            value={selector.promptTitle}
            onChange={(e) => onChange({ promptTitle: e.target.value })}
            placeholder={defaults.promptTitle}
          />
        </Form.Item>
        <Form.Item label={t(k('aliasEnabled'))} extra={t(k('aliasEnabledHint'))}>
          <Space>
            <Switch
              checked={selector.aliasEnabled !== false}
              onChange={(checked) => onChange({ aliasEnabled: checked })}
            />
            {selector.aliasEnabled !== false && selector.funcName && (
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {selector.funcName}d
              </Text>
            )}
          </Space>
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>{t(k('localSelector'))}</Divider>

        <Form.Item label={t(k('localEnabled'))}>
          <Space>
            <Switch
              checked={ls.enabled}
              onChange={(checked) => onChange({ localSelector: { ...ls, enabled: checked } })}
            />
            <Text type="secondary">{t(k('localEnabledHint'))}</Text>
          </Space>
        </Form.Item>
        <Form.Item label={t(k('localFuncName'))}>
          <Input
            value={ls.funcName}
            onChange={(e) => onChange({ localSelector: { ...ls, funcName: e.target.value } })}
            placeholder={defaults.localFuncName}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t(k('localPromptTitle'))}>
          <Input
            value={ls.promptTitle ?? ''}
            onChange={(e) => onChange({ localSelector: { ...ls, promptTitle: e.target.value } })}
            placeholder={selector.promptTitle || defaults.promptTitle}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t(k('localAliasEnabled'))} extra={t(k('localAliasEnabledHint'))}>
          <Space>
            <Switch
              checked={ls.aliasEnabled !== false}
              onChange={(checked) => onChange({ localSelector: { ...ls, aliasEnabled: checked } })}
              disabled={!ls.enabled}
            />
            {ls.aliasEnabled !== false && ls.funcName && (
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {ls.funcName}d
              </Text>
            )}
          </Space>
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>{t(k('kanban'))}</Divider>

        <Form.Item label={t(k('kanbanEnabled'))}>
          <Switch
            checked={selector.kanban?.enabled ?? false}
            onChange={(checked) => onChange({ kanban: { funcName: selector.kanban?.funcName ?? defaults.kanbanFuncName, enabled: checked } })}
          />
        </Form.Item>
        <Form.Item label={t(k('kanbanFuncName'))}>
          <Input
            value={selector.kanban?.funcName ?? ''}
            onChange={(e) => onChange({ kanban: { funcName: e.target.value, enabled: selector.kanban?.enabled ?? false } })}
            placeholder={defaults.kanbanFuncName}
            disabled={!selector.kanban?.enabled}
          />
        </Form.Item>
      </Form>
    </Card>
  )
}
