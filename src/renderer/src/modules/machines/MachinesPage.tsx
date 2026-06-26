import { useEffect, useState } from 'react'
import { List, Button, Tag, Input, Space, App } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMachinesStore } from '@renderer/stores/useMachinesStore'

export function MachinesPage(): React.ReactElement {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const machines = useMachinesStore((s) => s.machines)
  const currentId = useMachinesStore((s) => s.currentMachineId)
  const loadMachines = useMachinesStore((s) => s.loadMachines)
  const renameMachine = useMachinesStore((s) => s.renameMachine)
  const deleteMachine = useMachinesStore((s) => s.deleteMachine)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  useEffect(() => { loadMachines() }, [loadMachines])

  const startEdit = (id: string, name: string) => { setEditingId(id); setDraftName(name) }
  const saveEdit = async () => {
    if (editingId && draftName.trim()) await renameMachine(editingId, draftName.trim())
    setEditingId(null)
  }
  const confirmDelete = (id: string) => {
    modal.confirm({
      title: t('common.confirmDelete'),
      content: t('machines.deleteConfirm'),
      okText: t('common.delete'), okType: 'danger', cancelText: t('common.cancel'),
      onOk: () => deleteMachine(id)
    })
  }

  const fmt = (ts: number) => new Date(ts).toLocaleString()

  return (
    <List
      dataSource={machines}
      renderItem={(m) => (
        <List.Item
          actions={[
            editingId === m.id
              ? <Button key="save" type="link" onClick={saveEdit}>{t('common.save')}</Button>
              : <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => startEdit(m.id, m.name)} />,
            ...(m.id === currentId ? [] : [
              <Button key="del" type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(m.id)} />
            ])
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                {editingId === m.id
                  ? <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} onPressEnter={saveEdit} style={{ width: 200 }} />
                  : m.name}
                {m.id === currentId && <Tag color="blue">{t('machines.current')}</Tag>}
              </Space>
            }
            description={`${m.os} · ${m.hostname} · ${t('machines.lastSeen')} ${fmt(m.lastSeenAt)}`}
          />
        </List.Item>
      )}
    />
  )
}
