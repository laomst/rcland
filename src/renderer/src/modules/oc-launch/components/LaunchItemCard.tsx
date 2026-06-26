import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Space, Switch, Typography, Tooltip, App, Select, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, WarningOutlined, CopyOutlined, GlobalOutlined } from '@ant-design/icons'
import type { OCLaunchItem, OCProvider } from '@shared/types'
import { useOCLandStore } from '@renderer/stores/useOCLandStore'
import { LaunchItemFormModal } from './LaunchItemFormModal'
import { ItemRow } from '@renderer/components/ItemRow'

const { Text } = Typography

const SDK_TYPE_LABEL: Record<OCProvider['sdkType'], string> = {
  anthropic: 'Anthropic',
  'openai-compatible': 'OpenAI'
}

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
  launchItem: OCLaunchItem
  providers: OCProvider[]
  index?: number
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const updateLaunchItem = useOCLandStore((s) => s.updateLaunchItem)
  const [editOpen, setEditOpen] = useState(false)

  const provider = providers.find((p) => p.id === launchItem.providerId)
  const accent = provider?.color || '#1677ff'
  const providerDisabled = !provider?.enabled && !launchItem.passthrough

  const launchItemName = launchItem.name || launchItem.funcName
  const selectedModel = provider?.models?.find((m) => m.id === launchItem.modelId)
  const modelLabel = selectedModel?.name ?? launchItem.modelId

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
                placeholder={t('ocLaunch.selectEndpoint')}
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
                placeholder={t('ocLaunch.selectKey')}
                options={(provider?.keys ?? []).map((k) => ({
                  value: k.id,
                  label: <span style={{ fontSize: 12 }}>{k.label}</span>
                }))}
              />
            </>
          )}

          {/* Warning */}
          {providerDisabled && (
            <Text type="warning" style={{ fontSize: 12 }}><WarningOutlined /> {t('ocLaunch.providerDisabledWarning')}</Text>
          )}

          {/* Action Buttons */}
          <Tooltip title={t('common.copy')}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => {
              const { id, ...rest } = launchItem
              useOCLandStore.getState().addLaunchItemAfter(launchItem.id, {
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
                content: t('ocLaunch.deleteConfigConfirm', { name: launchItem.funcName }),
                okText: t('common.delete'),
                okType: 'danger',
                cancelText: t('common.cancel'),
                onOk: () => useOCLandStore.getState().removeLaunchItem(launchItem.id)
              })
            }} />
          </Tooltip>
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
            <Tooltip title={provider?.name ?? t('ocLaunch.unknown')}>
              <Space size={4} style={{ width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }} />
                <Text style={{ fontSize: 12 }}>{provider?.name ?? t('ocLaunch.unknown')}</Text>
              </Space>
            </Tooltip>

            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>|</Text>

            {/* 2. sdkType tag */}
            {provider && (
              <Tag color={provider.sdkType === 'anthropic' ? 'blue' : 'green'} style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>
                {SDK_TYPE_LABEL[provider.sdkType]}
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
            {launchItem.modelId && (
              <>
                <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>|</Text>
                <Tooltip title={`model: ${modelLabel}`}>
                  <Tag style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>{modelLabel}</Tag>
                </Tooltip>
              </>
            )}
          </>
        )}
      </ItemRow>

      <LaunchItemFormModal
        open={editOpen}
        title={t('ocLaunch.editConfigTitle', { name: launchItemName })}
        providers={providers}
        initialValues={{
          providerId: launchItem.providerId,
          endpointId: launchItem.endpointId,
          keyId: launchItem.keyId,
          name: launchItem.name || '',
          funcName: launchItem.funcName,
          modelId: launchItem.modelId,
          passthrough: launchItem.passthrough ?? false,
          passthroughCommand: launchItem.passthroughCommand ?? '',
          useSystemProxy: launchItem.useSystemProxy ?? false,
          mcpMode: launchItem.mcpMode,
          mcpServerIds: launchItem.mcpServerIds
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
            modelId: values.modelId || undefined,
            passthrough: values.passthrough,
            passthroughCommand: values.passthrough ? (values.passthroughCommand?.trim() || undefined) : undefined,
            useSystemProxy: values.useSystemProxy,
            mcpMode: values.mcpMode,
            mcpServerIds: values.mcpServerIds
          })
          setEditOpen(false)
        }}
      />
    </>
  )
}
