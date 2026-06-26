import { Tag, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMachinesStore } from '@renderer/stores/useMachinesStore'

interface Props {
  applicableMachines?: string[]
}

export function MachineScopeTag({ applicableMachines }: Props): React.ReactElement {
  const { t } = useTranslation()
  const machines = useMachinesStore((s) => s.machines)
  const currentId = useMachinesStore((s) => s.currentMachineId)

  if (!applicableMachines || applicableMachines.length === 0) {
    return <Tag color="blue">{t('common.allMachines')}</Tag>
  }
  if (applicableMachines.length === 1 && applicableMachines[0] === currentId) {
    return <Tag>{t('common.currentMachine')}</Tag>
  }
  const nameOf = (id: string): string =>
    machines.find((m) => m.id === id)?.name ?? `${t('common.deletedMachine')}(${id.slice(0, 6)})`
  const first = nameOf(applicableMachines[0])
  const extra = applicableMachines.length - 1
  const full = applicableMachines.map(nameOf).join(', ')
  return (
    <Tooltip title={full}>
      <Tag>{extra > 0 ? `${first} +${extra}` : first}</Tag>
    </Tooltip>
  )
}
