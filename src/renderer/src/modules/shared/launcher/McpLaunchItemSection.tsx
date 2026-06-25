import { useEffect } from 'react'
import { Radio, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { McpServer } from '@shared/types'
import { useMcpServersStore } from '@renderer/stores/useMcpServersStore'
import { McpRefSelector } from './McpRefSelector'

const { Text } = Typography

interface McpLaunchItemSectionProps {
  mcpMode?: 'inherit' | 'custom'
  mcpServerIds?: string[]
  /** Provider's private MCP servers */
  providerMcpServers?: McpServer[]
  /** Provider's global pool references */
  providerMcpServerRefs?: string[]
  onModeChange: (mode: 'inherit' | 'custom') => void
  onServerIdsChange: (ids: string[]) => void
}

export function McpLaunchItemSection({
  mcpMode,
  mcpServerIds,
  providerMcpServers,
  providerMcpServerRefs,
  onModeChange,
  onServerIdsChange,
}: McpLaunchItemSectionProps): React.ReactElement {
  const { t } = useTranslation()
  const globalServers = useMcpServersStore((s) => s.servers)
  const loaded = useMcpServersStore((s) => s.loaded)

  useEffect(() => {
    if (!loaded) {
      useMcpServersStore.getState().loadData()
    }
  }, [loaded])

  const mode = mcpMode ?? 'inherit'

  // Compute the effective server list inherited from the provider
  const inheritedServers: McpServer[] = []
  // Global pool refs
  for (const refId of providerMcpServerRefs ?? []) {
    const found = globalServers.find((s) => s.id === refId)
    if (found) inheritedServers.push(found)
  }
  // Provider private servers
  for (const srv of providerMcpServers ?? []) {
    inheritedServers.push(srv)
  }

  // For custom mode: options = global pool + provider private servers
  const extraServers = (providerMcpServers ?? []).map((s) => ({ id: s.id, name: s.name }))

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Radio.Group
          value={mode}
          onChange={(e) => onModeChange(e.target.value as 'inherit' | 'custom')}
          size="small"
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="inherit">{t('mcp.modeInherit')}</Radio.Button>
          <Radio.Button value="custom">{t('mcp.modeCustom')}</Radio.Button>
        </Radio.Group>
      </Space>

      {mode === 'inherit' ? (
        <div>
          {inheritedServers.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('mcp.inheritEmpty')}
            </Text>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {inheritedServers.map((srv) => (
                <Tag key={srv.id} style={{ margin: 0 }}>
                  {srv.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ) : (
        <McpRefSelector
          value={mcpServerIds ?? []}
          onChange={onServerIdsChange}
          extraServers={extraServers}
          placeholder={t('mcp.selectServers')}
        />
      )}
    </div>
  )
}
