import { useState } from 'react'
import { Input, Modal, message } from 'antd'
import { useAppStore } from '@renderer/stores/useAppStore'

export function TokenEditModal({
  open,
  onConfirm,
  onCancel
}: {
  open: boolean
  onConfirm: (encrypted: string) => void
  onCancel: () => void
}): React.ReactElement {
  const encryptToken = useAppStore((s) => s.encryptToken)
  const keyExists = useAppStore((s) => s.keyExists)
  const openKeyModal = useAppStore((s) => s.openKeyModal)
  const [plainText, setPlainText] = useState('')

  const handleOk = async () => {
    if (!keyExists) {
      openKeyModal('init')
      return
    }
    try {
      const encrypted = await encryptToken(plainText)
      onConfirm(encrypted)
      setPlainText('')
    } catch (err) {
      message.error('加密失败: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <Modal
      title="输入 Token 明文"
      open={open}
      onOk={handleOk}
      onCancel={() => { setPlainText(''); onCancel() }}
      okText="确定（自动加密）"
      cancelText="取消"
      width={480}
    >
      <Input.TextArea
        value={plainText}
        onChange={(e) => setPlainText(e.target.value)}
        placeholder="粘贴或输入 Token 明文，确认后将自动加密"
        autoSize={{ minRows: 3, maxRows: 6 }}
        style={{ fontFamily: 'monospace', marginTop: 8 }}
      />
    </Modal>
  )
}
