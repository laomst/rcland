import React from 'react'
import { Card, Form, Input, Switch, Space, Typography, Divider } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'

const { Text } = Typography

export function SelectorTab(): React.ReactElement {
  const { t } = useTranslation()
  const selector = useCXLandStore((s) => s.data.selector)
  const updateCXSelector = useCXLandStore((s) => s.updateCXSelector)

  const ls = selector.localSelector ?? { enabled: false, funcName: 'cxl', aliasEnabled: true, requireSessionName: true }

  return (
    <Card>
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} labelAlign="left" colon={false} size="small">
        <Divider style={{ margin: '0 0 12px' }}>{t('cxLaunch.selector.mainSelector')}</Divider>
        <Form.Item label={t('cxLaunch.selector.funcName')}>
          <Input
            value={selector.funcName}
            onChange={(e) => updateCXSelector({ funcName: e.target.value })}
            placeholder="cx"
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.promptTitle')}>
          <Input
            value={selector.promptTitle}
            onChange={(e) => updateCXSelector({ promptTitle: e.target.value })}
            placeholder="选择 Codex 供应商"
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.requireSessionName')} extra={t('cxLaunch.selector.requireSessionNameHint')}>
          <Switch
            checked={selector.requireSessionName !== false}
            onChange={(checked) => updateCXSelector({ requireSessionName: checked })}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.aliasEnabled')} extra={t('cxLaunch.selector.aliasEnabledHint')}>
          <Space>
            <Switch
              checked={selector.aliasEnabled !== false}
              onChange={(checked) => updateCXSelector({ aliasEnabled: checked })}
            />
            {selector.aliasEnabled !== false && selector.funcName && (
              <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                {selector.funcName}d
              </Text>
            )}
          </Space>
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>{t('cxLaunch.selector.localSelector')}</Divider>

        <Form.Item label={t('cxLaunch.selector.localEnabled')}>
          <Space>
            <Switch
              checked={ls.enabled}
              onChange={(checked) => updateCXSelector({ localSelector: { ...ls, enabled: checked } })}
            />
            <Text type="secondary">{t('cxLaunch.selector.localEnabledHint')}</Text>
          </Space>
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.localFuncName')}>
          <Input
            value={ls.funcName}
            onChange={(e) => updateCXSelector({ localSelector: { ...ls, funcName: e.target.value } })}
            placeholder="cxl"
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.localPromptTitle')}>
          <Input
            value={ls.promptTitle ?? ''}
            onChange={(e) => updateCXSelector({ localSelector: { ...ls, promptTitle: e.target.value } })}
            placeholder={selector.promptTitle || '选择 Codex 供应商'}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.localRequireSessionName')} extra={t('cxLaunch.selector.localRequireSessionNameHint')}>
          <Switch
            checked={ls.requireSessionName !== false}
            onChange={(checked) => updateCXSelector({ localSelector: { ...ls, requireSessionName: checked } })}
            disabled={!ls.enabled}
          />
        </Form.Item>
        <Form.Item label={t('cxLaunch.selector.localAliasEnabled')} extra={t('cxLaunch.selector.localAliasEnabledHint')}>
          <Space>
            <Switch
              checked={ls.aliasEnabled !== false}
              onChange={(checked) => updateCXSelector({ localSelector: { ...ls, aliasEnabled: checked } })}
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
