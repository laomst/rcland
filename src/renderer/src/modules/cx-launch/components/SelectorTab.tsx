import React from 'react'
import { Card, Form, Input, Switch, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'

const { Text } = Typography

export function SelectorTab(): React.ReactElement {
  const { t } = useTranslation()
  const selector = useCXLandStore((s) => s.data.selector)
  const updateCXSelector = useCXLandStore((s) => s.updateCXSelector)

  return (
    <Card>
      <Form layout="vertical">
        <Form.Item label={t('cxLaunch.selector.enabled')}>
          <Space>
            <Switch
              checked={selector.enabled}
              onChange={(checked) => updateCXSelector({ enabled: checked })}
            />
            <Text type="secondary">{t('cxLaunch.selector.enabledHint')}</Text>
          </Space>
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.requireSessionName')} extra={t('cxLaunch.selector.requireSessionNameHint')}>
          <Switch
            checked={selector.requireSessionName !== false}
            onChange={(checked) => updateCXSelector({ requireSessionName: checked })}
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.funcName')}>
          <Input
            value={selector.funcName}
            onChange={(e) => updateCXSelector({ funcName: e.target.value })}
            placeholder="cx"
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.promptTitle')}>
          <Input
            value={selector.promptTitle}
            onChange={(e) => updateCXSelector({ promptTitle: e.target.value })}
            placeholder="选择 Codex 供应商"
            disabled={!selector.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.aliasName')} extra={t('cxLaunch.selector.aliasNameHint')}>
          <Input
            value={selector.aliasName || ''}
            onChange={(e) => updateCXSelector({ aliasName: e.target.value })}
            placeholder="cxd"
            disabled={!selector.enabled}
          />
        </Form.Item>
      </Form>
    </Card>
  )
}
