import { useState, useEffect } from 'react'
import { Input, Modal, App } from 'antd'
import { useAppStore } from '@renderer/stores/useAppStore'
import type { ProviderKey } from '@shared/types'

interface KeyEditModalProps {
  open: boolean
  editingKey: ProviderKey | null
  onConfirm: (key: ProviderKey) => void
  onCancel: () => void
}

export function KeyEditModal({
  open,
  editingKey,
  onConfirm,
  onCancel
}: KeyEditModalProps): React.ReactElement {
  const { message } = App.useApp()
  const encryptToken = useAppStore((s) => s.encryptToken)
  const keyExists = useAppStore((s) => s.keyExists)
  const openKeyModal = useAppStore((s) => s.openKeyModal)

  const [label, setLabel] = useState('')
  const [plainText, setPlainText] = useState('')
  const [comment, setComment] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (open && editingKey) {
      setLabel(editingKey.label)
      setPlainText('') // Can't decrypt, start empty
      setComment(editingKey.comment || '')
    } else if (open) {
      setLabel('')
      setPlainText('')
      setComment('')
    }
  }, [open, editingKey])

  const handleOk = async () => {
    if (!label.trim()) {
      message.warning('请输入标签')
      return
    }

    // Editing existing key but no new token entered
    if (editingKey && !plainText.trim()) {
      onConfirm({ ...editingKey, label, comment })
      return
    }

    // New key or token changed - need encryption
    if (!keyExists) {
      openKeyModal('init')
      return
    }

    if (!plainText.trim()) {
      message.warning('请输入 Token')
      return
    }

    try {
      const encrypted = await encryptToken(plainText)
      onConfirm({
        id: editingKey?.id || crypto.randomUUID(),
        label,
        token: encrypted,
        comment: comment || undefined
      })
      setPlainText('')
    } catch (err) {
      message.error('加密失败: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleCancel = () => {
    setPlainText('')
    onCancel()
  }

  return (
    <Modal
      title={editingKey ? '编辑密钥' : '添加密钥'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={480}
    >
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>标签 *</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="如: 生产环境、测试账号"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Token {editingKey && <span style={{ fontWeight: 400, color: '#999' }}>(留空保持不变)</span>}
          </label>
          <Input.TextArea
            value={plainText}
            onChange={(e) => setPlainText(e.target.value)}
            placeholder={editingKey ? '输入新 Token 以更新（留空保持原值）' : '粘贴或输入 Token 明文'}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ fontFamily: 'monospace' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>备注</label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="可选备注"
          />
        </div>
      </div>
    </Modal>
  )
}
