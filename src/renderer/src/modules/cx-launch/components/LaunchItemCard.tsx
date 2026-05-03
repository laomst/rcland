import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Space, Switch, Typography, Tooltip, App, Select, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, WarningOutlined, CopyOutlined, GlobalOutlined } from '@ant-design/icons'
import type { CXLaunchItem, CXProvider } from '@shared/types'
import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

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
  launchItem,
  providers,
  index,
  isDragging,
  dragHandleProps
}: {
  launchItem: CXLaunchItem
  providers: CXProvider[]
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const updateLaunchItem = useCXLandStore((s) => s.updateLaunchItem)
  const [editOpen, setEditOpen] = useState(false)

  const provider = providers.find((p) => p.id === launchItem.providerId)
  const accent = provider?.color || '#1677ff'
  const providerDisabled = !provider?.enabled && !launchItem.passthrough

  const launchItemName = launchItem.name || launchItem.funcName

  return (
    <>
      <ItemRow
        index={index}
        isDragging={isDragging}
        enabled={launchItem.enabled}
        borderColor={launchItem.passthrough ? '#52c41a' : providerDisabled ? '#faad14' : accent}
        background={!launchItem.enabled ? '#f0f0f0' : providerDisabled ? '#fff7e6' : '#f6f8fa'}
        dragHandleProps={dragHandleProps}
        actions={<>
          {!launchItem.passthrough && (
            <>
              {/* Endpoint Selector */}
              <Select
                size="small"
                variant="borderless"
                value={launchItem.endpointId}
                onChange={(val) => updateLaunchItem(launchItem.id, { endpointId: val })}
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
                value={launchItem.keyId}
                onChange={(val) => updateLaunchItem(launchItem.id, { keyId: val })}
                style={{ width: 90, textAlign: 'right' }}
                popupMatchSelectWidth={false}
                placeholder={t('ccLaunch.selectKey')}
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
              const { id, ...rest } = launchItem
              useCXLandStore.getState().addLaunchItem({
                ...rest,
                id: crypto.randomUUID(),
                funcName: launchItem.funcName + '-copy'
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
                content: t('ccLaunch.deleteConfigConfirm', { name: launchItem.funcName }),
                okText: t('common.delete'),
                okType: 'danger',
                cancelText: t('common.cancel'),
                onOk: () => useCXLandStore.getState().removeLaunchItem(launchItem.id)
              })
            }} />
          </Tooltip>
          <Select
            size="small"
            variant="borderless"
            value={launchItem.localOnly ? 'local' : 'sync'}
            onChange={(val) => updateLaunchItem(launchItem.id, { localOnly: val === 'local' })}
            style={{ width: 70 }}
            options={[
              { value: 'sync', label: t('common.synced') },
              { value: 'local', label: t('common.local') }
            ]}
          />
          <Switch
            size="small"
            checked={launchItem.enabled}
            onChange={(checked) => updateLaunchItem(launchItem.id, { enabled: checked })}
          />
        </>}
      >
        {launchItem.passthrough ? (
          <>
            <Tag color="green" style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>透传</Tag>
            <Tooltip title={`${launchItemName} (${launchItem.funcName})`}>
              <div style={{ ...flexCol(1), display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{launchItemName}</Text>
                <Text code style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>({launchItem.funcName})</Text>
              </div>
            </Tooltip>
            {launchItem.useSystemProxy && (
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

            {/* 2. wireApi tag */}
            {provider && (
              <Tag color={provider.wireApi === 'responses' ? 'green' : 'blue'} style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>
                {provider.wireApi}
              </Tag>
            )}

            {/* 3. LaunchItem Name + Function Name - flexible */}
            <Tooltip title={`${launchItemName} (${launchItem.funcName})`}>
              <div style={{ ...flexCol(1), display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{launchItemName}</Text>
                <Text code style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>({launchItem.funcName})</Text>
              </div>
            </Tooltip>

            {/* 4. Model (if set) */}
            {launchItem.model && (
              <>
                <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>|</Text>
                <Tooltip title={`model: ${launchItem.model}`}>
                  <Tag style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>{launchItem.model}</Tag>
                </Tooltip>
              </>
            )}
          </>
        )}
      </ItemRow>

      <LaunchItemFormModal
        open={editOpen}
        title={t('ccLaunch.editConfigTitle', { name: launchItemName })}
        providers={providers}
        initialValues={{
          providerId: launchItem.providerId,
          endpointId: launchItem.endpointId,
          keyId: launchItem.keyId,
          name: launchItem.name || '',
          funcName: launchItem.funcName,
          model: launchItem.model || '',
          passthrough: launchItem.passthrough ?? false,
          useSystemProxy: launchItem.useSystemProxy ?? false,
          localOnly: launchItem.localOnly ?? false
        }}
        okText={t('common.save')}
        onCancel={() => setEditOpen(false)}
        onOk={(values) => {
          updateLaunchItem(launchItem.id, {
            providerId: values.providerId,
            endpointId: values.endpointId,
            keyId: values.keyId,
            name: values.name,
            funcName: values.funcName,
            model: values.model?.trim() || undefined,
            passthrough: values.passthrough,
            useSystemProxy: values.useSystemProxy,
            localOnly: values.localOnly
          })
          setEditOpen(false)
        }}
      />
    </>
  )
}
