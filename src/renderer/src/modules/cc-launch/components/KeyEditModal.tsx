import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, App } from 'antd'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
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
  const { t } = useTranslation()
  const { message } = App.useApp()
  const encryptToken = useSettingsStore((s) => s.encryptToken)
  const keyExists = useSettingsStore((s) => s.keyExists)
  const openKeyModal = useSettingsStore((s) => s.openKeyModal)

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
      message.warning(t('ccLaunch.enterLabel'))
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
      message.warning(t('ccLaunch.enterToken'))
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
      message.error(t('ccLaunch.encryptFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  const handleCancel = () => {
    setPlainText('')
    onCancel()
  }

  return (
    <Modal
      title={editingKey ? t('ccLaunch.editKey') : t('ccLaunch.addKeyTitle')}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      width={480}
    >
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('ccLaunch.keyLabel')}</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('ccLaunch.keyLabelPlaceholder')}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            {t('ccLaunch.tokenField')} {editingKey && <span style={{ fontWeight: 400, color: '#999' }}>{t('ccLaunch.leaveBlankKeep')}</span>}
          </label>
          <Input.TextArea
            value={plainText}
            onChange={(e) => setPlainText(e.target.value)}
            placeholder={editingKey ? t('ccLaunch.tokenUpdatePlaceholder') : t('ccLaunch.tokenNewPlaceholder')}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ fontFamily: 'monospace' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('ccLaunch.remark')}</label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('ccLaunch.remarkPlaceholder')}
          />
        </div>
      </div>
    </Modal>
  )
}
