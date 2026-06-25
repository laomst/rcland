import { useEffect } from 'react'
import { Select } from 'antd'
import { useMcpServersStore } from '@renderer/stores/useMcpServersStore'

interface McpRefSelectorProps {
  value?: string[]
  onChange?: (ids: string[]) => void
  /** Additional MCP server options beyond the global pool (e.g. provider private servers) */
  extraServers?: Array<{ id: string; name: string }>
  placeholder?: string
  style?: React.CSSProperties
}

export function McpRefSelector({
  value,
  onChange,
  extraServers,
  placeholder,
  style,
}: McpRefSelectorProps): React.ReactElement {
  const servers = useMcpServersStore((s) => s.servers)
  const loaded = useMcpServersStore((s) => s.loaded)

  useEffect(() => {
    if (!loaded) {
      useMcpServersStore.getState().loadData()
    }
  }, [loaded])

  // Combine global pool + extra private servers, deduplicating by id
  const extraMap = new Map((extraServers ?? []).map((s) => [s.id, s]))
  const globalOptions = servers.map((s) => ({
    value: s.id,
    label: s.name,
    group: 'global',
  }))
  const extraOptions = [...extraMap.values()]
    .filter((s) => !servers.some((gs) => gs.id === s.id))
    .map((s) => ({ value: s.id, label: s.name, group: 'extra' }))

  const options = [...globalOptions, ...extraOptions]

  return (
    <Select
      mode="multiple"
      value={value ?? []}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      style={style ?? { width: '100%' }}
      allowClear
      showSearch
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
      }
    />
  )
}
