import { Card, Form, Input, Switch, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@renderer/stores/useAppStore'

const { Text } = Typography

export function SelectorTab(): React.ReactElement {
  const { t } = useTranslation()
  const selector = useAppStore((s) => s.selector)
  const updateSelector = useAppStore((s) => s.updateSelector)

  return (
    <Card>
      <Form layout="vertical">
        <Form.Item label={t('ccLaunch.selector.enabled')}>
          <Space>
            <Switch
              checked={selector.enabled}
              onChange={(checked) => updateSelector({ enabled: checked })}
            />
            <Text type="secondary">{t('ccLaunch.selector.enabledHint')}</Text>
          </Space>
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.requireSessionName')} extra={t('ccLaunch.selector.requireSessionNameHint')}>
          <Switch
            checked={selector.requireSessionName !== false}
            onChange={(checked) => updateSelector({ requireSessionName: checked })}
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.funcName')}>
          <Input
            value={selector.funcName}
            onChange={(e) => updateSelector({ funcName: e.target.value })}
            placeholder="cc"
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.promptTitle')}>
          <Input
            value={selector.promptTitle}
            onChange={(e) => updateSelector({ promptTitle: e.target.value })}
            placeholder="选择启动器"
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('ccLaunch.selector.aliasName')} extra={t('ccLaunch.selector.aliasNameHint')}>
          <Input
            value={selector.aliasName || ''}
            onChange={(e) => updateSelector({ aliasName: e.target.value })}
            placeholder="ccd"
            disabled={!selector.enabled}
          />
        </Form.Item>
      </Form>
    </Card>
  )
}
