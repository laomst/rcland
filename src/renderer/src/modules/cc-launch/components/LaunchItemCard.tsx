import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Space, Switch, Typography, Tooltip, App, Select, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, WarningOutlined, CopyOutlined, GlobalOutlined } from '@ant-design/icons'
import type { LaunchItem, Provider } from '@shared/types'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { ItemRow } from '@renderer/components/ItemRow'
import { createLaunchItemUpdatePatch } from './launch-item-update'

const { Text } = Typography

/** Flexible column style with ellipsis */
const flexCol = (flex: number): React.CSSProperties => ({
  flex,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export function LaunchItemCard({
  config,
  providers,
  index,
  isDragging,
  dragHandleProps
}: {
  config: LaunchItem
  providers: Provider[]
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const updateLaunchItem = useCCLaunchStore((s) => s.updateLaunchItem)
  const [editOpen, setEditOpen] = useState(false)

  const provider = providers.find((p) => p.id === config.providerId)
  const accent = provider?.color || '#1677ff'
  const providerDisabled = !provider?.enabled && !config.passthrough

  const key = provider?.keys.find((k) => k.id === config.keyId)
  const keyMissing = !key && config.keyId

  const configName = config.name || config.funcName

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={config.enabled}
        borderColor={config.passthrough ? '#52c41a' : providerDisabled ? '#faad14' : accent}
        background={!config.enabled ? '#f0f0f0' : providerDisabled ? '#fff7e6' : '#f6f8fa'}
        dragHandleProps={dragHandleProps}
        actions={<>
          {!config.passthrough && (
            <>
              {/* Endpoint Selector */}
              <Select
                size="small"
                variant="borderless"
                value={config.endpointId}
                onChange={(val) => updateLaunchItem(config.id, { endpointId: val })}
                style={{ width: 140, textAlign: 'right' }}
                popupMatchSelectWidth={false}
                placeholder={t('ccLaunch.selectEndpoint')}
                options={(provider?.endpoints ?? []).map((ep) => ({
                  value: ep.id,
                  label: <span style={{ fontSize: 12 }}>{ep.label || ep.url}</span>
                }))}
              />

              {/* Key Selector */}
              <Select
                size="small"
                variant="borderless"
                value={config.keyId}
                onChange={(val) => updateLaunchItem(config.id, { keyId: val })}
                style={{ width: 90, textAlign: 'right' }}
                popupMatchSelectWidth={false}
                placeholder={t('ccLaunch.selectKey')}
                status={keyMissing ? 'error' : undefined}
                options={(provider?.keys ?? []).map((k) => ({
                  value: k.id,
                  label: <span style={{ fontSize: 12 }}>{k.label}</span>
                }))}
              />
            </>
          )}

          {/* Warning */}
          {providerDisabled && (
            <Text type="warning" style={{ fontSize: 12 }}><WarningOutlined /> {t('ccLaunch.providerDisabledWarning')}</Text>
          )}

          {/* Action Buttons */}
          <Tooltip title={t('common.copy')}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => {
              const { id, ...rest } = config
              useCCLaunchStore.getState().addLaunchItemAfter(config.id, {
                ...rest,
                id: crypto.randomUUID(),
                funcName: config.funcName + '-copy'
              })
            }} />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
              modal.confirm({
                title: t('common.confirmDelete'),
                content: t('ccLaunch.deleteLaunchItemConfirm', { name: config.funcName }),
                okText: t('common.delete'),
                okType: 'danger',
                cancelText: t('common.cancel'),
                onOk: () => useCCLaunchStore.getState().removeLaunchItem(config.id)
              })
            }} />
          </Tooltip>
          <Select
            size="small"
            variant="borderless"
            value={config.localOnly ? 'local' : 'sync'}
            onChange={(val) => updateLaunchItem(config.id, { localOnly: val === 'local' })}
            style={{ width: 70 }}
            options={[
              { value: 'sync', label: t('common.synced') },
              { value: 'local', label: t('common.local') }
            ]}
          />
          <Switch
            size="small"
            checked={config.enabled}
            onChange={(checked) => updateLaunchItem(config.id, { enabled: checked })}
          />
        </>}
      >
        {config.passthrough ? (
          <>
            <Tag color="green" style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>透传</Tag>
            <Tooltip title={`${configName} (${config.funcName})`}>
              <div style={{ ...flexCol(1), display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{configName}</Text>
                <Text code style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>({config.funcName})</Text>
              </div>
            </Tooltip>
            {config.useSystemProxy && (
              <Tooltip title="系统代理已启用">
                <GlobalOutlined style={{ fontSize: 14, color: '#52c41a', flexShrink: 0 }} />
              </Tooltip>
            )}
          </>
        ) : (
          <>
            {/* 1. Provider - fixed */}
            <Tooltip title={provider?.name ?? t('ccLaunch.unknown')}>
              <Space size={4} style={{ width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }} />
                <Text style={{ fontSize: 12 }}>{provider?.name ?? t('ccLaunch.unknown')}</Text>
              </Space>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>|</Text>

            {/* 2. Config Name + Function Name - flexible */}
            <Tooltip title={`${configName} (${config.funcName})`}>
              <div style={{ ...flexCol(1), display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{configName}</Text>
                <Text code style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>({config.funcName})</Text>
              </div>
            </Tooltip>
          </>
        )}
      </ItemRow>

      <LaunchItemFormModal
        open={editOpen}
        title={t('ccLaunch.editLaunchItemTitle', { name: configName })}
        providers={providers}
        initialValues={{
          providerId: config.providerId,
          endpointId: config.endpointId,
          keyId: config.keyId,
          name: config.name || '',
          funcName: config.funcName,
          envVars: { ...config.envVars },
          passthrough: config.passthrough ?? false,
          useSystemProxy: config.useSystemProxy ?? false,
          localOnly: config.localOnly ?? false
        }}
        okText={t('common.save')}
        onCancel={() => setEditOpen(false)}
        onOk={(values) => {
          updateLaunchItem(config.id, createLaunchItemUpdatePatch(values))
          setEditOpen(false)
        }}
      />
    </>
  )
}
