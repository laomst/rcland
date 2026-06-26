import { Radio, Select, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMachinesStore } from '@renderer/stores/useMachinesStore'

interface Props {
  value?: string[]
  onChange: (value: string[] | undefined) => void
}

export function MachineScopeSelect({ value, onChange }: Props): React.ReactElement {
  const { t } = useTranslation()
  const machines = useMachinesStore((s) => s.machines)
  const currentId = useMachinesStore((s) => s.currentMachineId)
  const isLimited = !!value && value.length > 0

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Radio.Group
        value={isLimited ? 'limited' : 'all'}
        onChange={(e) => {
          if (e.target.value === 'all') onChange(undefined)
          else onChange(currentId ? [currentId] : [])  // 默认勾本机
        }}
      >
        <Radio value="all">{t('common.machineScopeAll')}</Radio>
        <Radio value="limited">{t('common.machineScopeLimited')}</Radio>
      </Radio.Group>
      {isLimited && (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={value}
          onChange={(v: string[]) => onChange(v)}
          options={machines.map((m) => ({
            value: m.id,
            label: m.id === currentId ? `${m.name} (${t('common.currentMachine')})` : m.name
          }))}
        />
      )}
    </Space>
  )
}
