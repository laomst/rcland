import { useState, useCallback, useEffect, memo } from 'react'
import { Modal, Input, App } from 'antd'
import { SHELL_LABELS, type ShellType } from '@shared/shell'
import { useTranslation } from 'react-i18next'

interface TempKeyModalProps {
  open: boolean
  enabledShells: ShellType[]
  onSuccess: (key: string) => void
  onClose: () => void
}

function TempKeyModalComponent({ open, enabledShells, onSuccess, onClose }: TempKeyModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [tempKeyValue, setTempKeyValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTempKeyValue('')
      setShake(false)
    }
  }, [open])

  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!tempKeyValue.trim()) {
      message.warning(t('crypto.enterKey'))
      triggerShake()
      return
    }
    setLoading(true)
    try {
      const result = await window.electronAPI.tryApplyWithKey(enabledShells, tempKeyValue)
      if (result && result.success) {
        const shellNames = (result.appliedShells ?? []).map((s) => SHELL_LABELS[s]).join(', ')
        if (result.count && result.count > 0) {
          message.success(t('app.applySuccess', { shells: shellNames }))
        } else {
          message.warning(t('app.applyNone'))
        }
        onSuccess(tempKeyValue)
      } else if (result && result.error === 'DECRYPT_FAILED') {
        message.error(t('crypto.wrongKey'))
        triggerShake()
      } else {
        message.error(`${t('app.applyFailed')}: ${result?.error || 'unknown'}`)
        triggerShake()
      }
    } catch (err) {
      message.error(`${t('app.applyFailed')}: ${err instanceof Error ? err.message : String(err)}`)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }, [tempKeyValue, enabledShells, onSuccess, triggerShake])

  return (
    <Modal
      title={t('crypto.decryptFailed')}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={t('crypto.retryWithTempKey')}
      cancelText={t('common.cancel')}
      width={480}
    >
      <div className={shake ? 'shake-animation' : ''} style={{ marginTop: 8 }}>
        <p>{t('crypto.decryptFailedDesc')}</p>
        <Input.Password
          value={tempKeyValue}
          onChange={(e) => setTempKeyValue(e.target.value)}
          placeholder={t('crypto.enterKeyPlaceholder')}
          status={shake ? 'error' : undefined}
          style={{ marginBottom: 8 }}
          autoFocus
        />
        <div style={{ fontSize: 12, color: '#999' }}>
          {t('crypto.tempKeyHint')}
        </div>
      </div>
    </Modal>
  )
}

export const TempKeyModal = memo(TempKeyModalComponent)
