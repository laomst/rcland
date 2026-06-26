import { useEffect, useState } from 'react'
import { App, Modal, Radio, Select, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { Machine } from '@shared/types'

interface Props {
  onClaimed: () => void
}

export function MachineClaimDialog({ onClaimed }: Props): React.ReactElement {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [machines, setMachines] = useState<Machine[]>([])
  const [mode, setMode] = useState<'new' | 'adopt'>('new')
  const [adoptId, setAdoptId] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.electronAPI.machineStatus().then((s) => setMachines(s.machines))
  }, [])

  const canAdopt = machines.length > 0

  const handleOk = async () => {
    setSubmitting(true)
    try {
      await window.electronAPI.machineClaim(mode, mode === 'adopt' ? adoptId : undefined)
      onClaimed()
    } catch (err) {
      setSubmitting(false)
      message.error(String(err instanceof Error ? err.message : err))
    }
  }

  return (
    <Modal
      open
      title={t('machines.claimTitle')}
      okText={t('common.confirm')}
      onOk={handleOk}
      closable={false}
      maskClosable={false}
      cancelButtonProps={{ style: { display: 'none' } }}
      confirmLoading={submitting}
      okButtonProps={{ disabled: mode === 'adopt' && !adoptId }}
    >
      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
        <Space direction="vertical">
          <Radio value="new">{t('machines.claimNew')}</Radio>
          <Radio value="adopt" disabled={!canAdopt}>{t('machines.claimAdopt')}</Radio>
        </Space>
      </Radio.Group>
      {mode === 'adopt' && canAdopt && (
        <Select
          style={{ width: '100%', marginTop: 12 }}
          placeholder={t('machines.claimAdopt')}
          value={adoptId}
          onChange={setAdoptId}
          options={machines.map((m) => ({ value: m.id, label: `${m.name} · ${m.os} · ${m.hostname}` }))}
        />
      )}
      {mode === 'adopt' && !canAdopt && (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {t('machines.claimAdoptEmpty')}
        </Typography.Text>
      )}
    </Modal>
  )
}
