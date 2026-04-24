import { Modal, Input } from 'antd'
import { App as AntdApp } from 'antd'
import { forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { TempKeyModal } from './TempKeyModal'
import type { ShellType } from '@shared/shell'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useTranslation } from 'react-i18next'

export interface KeyModalsHandle {
  openTempKeyModal: () => void
}

export interface KeyModalsProps {
  enabledShells: ShellType[]
}

export const KeyModals = forwardRef<KeyModalsHandle, KeyModalsProps>(function KeyModals(
  { enabledShells },
  ref
) {
  const { t } = useTranslation()
  const { message } = AntdApp.useApp()

  const keyModalOpen = useSettingsStore((s) => s.keyModalOpen)
  const keyModalMode = useSettingsStore((s) => s.keyModalMode)
  const refreshKeyExists = useSettingsStore((s) => s.refreshKeyExists)
  const closeKeyModal = useSettingsStore((s) => s.closeKeyModal)

  const [keyInput, setKeyInput] = useState('')
  const [tempKeyModalOpen, setTempKeyModalOpen] = useState(false)
  const [lastSuccessfulTempKey, setLastSuccessfulTempKey] = useState('')
  const [saveKeyConfirmOpen, setSaveKeyConfirmOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    openTempKeyModal: () => setTempKeyModalOpen(true)
  }))

  const handleKeyModalOk = async () => {
    try {
      if (keyModalMode === 'replace') {
        await window.electronAPI.reencryptAll(keyInput || undefined)
      } else {
        await window.electronAPI.initKey(keyInput || undefined)
      }
      await refreshKeyExists()
      closeKeyModal()
      setKeyInput('')
      message.success(keyModalMode === 'init' ? t('crypto.keyInitialized') : t('crypto.keyReplaced'))
    } catch (err) {
      message.error(t('common.operationFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  const handleTempKeySuccess = useCallback((key: string) => {
    setTempKeyModalOpen(false)
    setLastSuccessfulTempKey(key)
    setSaveKeyConfirmOpen(true)
  }, [])

  const handleSaveKeyConfirm = async () => {
    try {
      await window.electronAPI.reencryptAll(lastSuccessfulTempKey)
      await refreshKeyExists()
      setSaveKeyConfirmOpen(false)
      setLastSuccessfulTempKey('')
      message.success(t('crypto.keySaved'))
    } catch (err) {
      message.error(t('crypto.saveKeyFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <>
      {/* Key Modal */}
      <Modal
        title={keyModalMode === 'init' ? t('crypto.initKeyTitle') : t('crypto.replaceKeyTitle')}
        open={keyModalOpen}
        onOk={handleKeyModalOk}
        onCancel={() => closeKeyModal()}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={480}
      >
        <div style={{ marginTop: 8 }}>
          <Input.Password
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={t('crypto.customKeyPlaceholder')}
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: 12, color: '#999' }}>
            {keyModalMode === 'replace' && t('crypto.replaceKeyWarning')}
            {t('crypto.customKeyHint')}
          </div>
        </div>
      </Modal>

      {/* Temp Key Modal - for decrypt failure */}
      <TempKeyModal
        open={tempKeyModalOpen}
        enabledShells={enabledShells}
        onSuccess={handleTempKeySuccess}
        onClose={() => setTempKeyModalOpen(false)}
      />

      {/* Save Key Confirm Modal */}
      <Modal
        title={t('crypto.saveKeyTitle')}
        open={saveKeyConfirmOpen}
        onOk={handleSaveKeyConfirm}
        onCancel={() => setSaveKeyConfirmOpen(false)}
        okText={t('common.save')}
        cancelText={t('crypto.saveKeySkip')}
        width={480}
      >
        <div style={{ marginTop: 8 }}>
          <p>{t('crypto.saveKeyPrompt')}</p>
          <p style={{ fontSize: 12, color: '#999' }}>{t('crypto.saveKeyHint')}</p>
        </div>
      </Modal>
    </>
  )
})
