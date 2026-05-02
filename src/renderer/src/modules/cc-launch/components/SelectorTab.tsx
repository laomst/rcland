import { Card, Form, Input, Switch, Space, Typography, Divider } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@renderer/stores/useAppStore'

const { Text } = Typography

export function SelectorTab(): React.ReactElement {
  const { t } = useTranslation()
  const selector = useAppStore((s) => s.selector)
  const updateSelector = useAppStore((s) => s.updateSelector)

  const ls = selector.localSelector ?? { enabled: false, funcName: 'ccl', aliasEnabled: true, requireSessionName: true }

  return (
    <Card>
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} labelAlign="left" colon={false} size="small">
        <Divider style={{ margin: '0 0 12px' }}>{t('ccLaunch.selector.mainSelector')}</Divider>
        <Form.Item label={t('ccLaunch.selector.funcName')}>
          <Input
            value={selector.funcName}
            onChange={(e) => updateSelector({ funcName: e.target.value })}
            placeholder="cc"
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.promptTitle')}>
          <Input
            value={selector.promptTitle}
            onChange={(e) => updateSelector({ promptTitle: e.target.value })}
            placeholder="选择启动器"
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.requireSessionName')} extra={t('ccLaunch.selector.requireSessionNameHint')}>
          <Switch
            checked={selector.requireSessionName !== false}
            onChange={(checked) => updateSelector({ requireSessionName: checked })}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.aliasEnabled')} extra={t('ccLaunch.selector.aliasEnabledHint')}>
          <Space>
            <Switch
              checked={selector.aliasEnabled !== false}
              onChange={(checked) => updateSelector({ aliasEnabled: checked })}
            />
            {selector.aliasEnabled !== false && selector.funcName && (
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {selector.funcName}d
              </Text>
            )}
          </Space>
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>{t('ccLaunch.selector.localSelector')}</Divider>

        <Form.Item label={t('ccLaunch.selector.localEnabled')}>
          <Space>
            <Switch
              checked={ls.enabled}
              onChange={(checked) => updateSelector({ localSelector: { ...ls, enabled: checked } })}
            />
            <Text type="secondary">{t('ccLaunch.selector.localEnabledHint')}</Text>
          </Space>
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.localFuncName')}>
          <Input
            value={ls.funcName}
            onChange={(e) => updateSelector({ localSelector: { ...ls, funcName: e.target.value } })}
            placeholder="ccl"
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.localPromptTitle')}>
          <Input
            value={ls.promptTitle ?? ''}
            onChange={(e) => updateSelector({ localSelector: { ...ls, promptTitle: e.target.value } })}
            placeholder={selector.promptTitle || '选择启动器'}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.localRequireSessionName')} extra={t('ccLaunch.selector.localRequireSessionNameHint')}>
          <Switch
            checked={ls.requireSessionName !== false}
            onChange={(checked) => updateSelector({ localSelector: { ...ls, requireSessionName: checked } })}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.localAliasEnabled')} extra={t('ccLaunch.selector.localAliasEnabledHint')}>
          <Space>
            <Switch
              checked={ls.aliasEnabled !== false}
              onChange={(checked) => updateSelector({ localSelector: { ...ls, aliasEnabled: checked } })}
              disabled={!ls.enabled}
            />
            {ls.aliasEnabled !== false && ls.funcName && (
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {ls.funcName}d
              </Text>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
