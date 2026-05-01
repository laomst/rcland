import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Modal, message } from 'antd'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'

export function CXTokenEditModal({
  open,
  onConfirm,
  onCancel
}: {
  open: boolean
  onConfirm: (encrypted: string) => void
  onCancel: () => void
}): React.ReactElement {
  const { t } = useTranslation()
  const encryptToken = useSettingsStore((s) => s.encryptToken)
  const keyExists = useSettingsStore((s) => s.keyExists)
  const openKeyModal = useSettingsStore((s) => s.openKeyModal)
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
      message.error(t('ccLaunch.encryptFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <Modal
      title={t('ccLaunch.tokenEditTitle')}
      open={open}
      onOk={handleOk}
      onCancel={() => { setPlainText(''); onCancel() }}
      okText={t('ccLaunch.tokenEditOk')}
      cancelText={t('common.cancel')}
      width={480}
    >
      <Input.TextArea
        value={plainText}
        onChange={(e) => setPlainText(e.target.value)}
        placeholder={t('ccLaunch.tokenEditPlaceholder')}
        autoSize={{ minRows: 3, maxRows: 6 }}
        style={{ fontFamily: 'monospace', marginTop: 8 }}
      />
    </Modal>
  )
}
