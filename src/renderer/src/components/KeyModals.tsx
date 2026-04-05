import { Modal, Input } from 'antd'
import { App as AntdApp } from 'antd'
import { forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { TempKeyModal } from './TempKeyModal'
import type { ShellType } from '@shared/shell'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'

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
      message.success(keyModalMode === 'init' ? '密钥已初始化' : '密钥已更换，所有 Token 已重新加密')
    } catch (err) {
      message.error(`操作失败: ${err instanceof Error ? err.message : String(err)}`)
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
      message.success('密钥已保存，所有 Token 已用新密钥重新加密')
    } catch (err) {
      message.error(`保存密钥失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <>
      {/* Key Modal */}
      <Modal
        title={keyModalMode === 'init' ? '初始化密钥' : '更换密钥'}
        open={keyModalOpen}
        onOk={handleKeyModalOk}
        onCancel={() => closeKeyModal()}
        okText="确定"
        cancelText="取消"
        width={480}
      >
        <div style={{ marginTop: 8 }}>
          <Input.Password
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="输入自定义密钥（留空则随机生成）"
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: 12, color: '#999' }}>
            {keyModalMode === 'replace' && '更换密钥后，已有加密数据需重新加密。'}
            留空将自动生成 64 位随机密钥
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
        title="保存密钥"
        open={saveKeyConfirmOpen}
        onOk={handleSaveKeyConfirm}
        onCancel={() => setSaveKeyConfirmOpen(false)}
        okText="保存"
        cancelText="跳过"
        width={480}
      >
        <div style={{ marginTop: 8 }}>
          <p>临时密钥使用成功！是否将其保存为默认密钥文件？</p>
          <p style={{ fontSize: 12, color: '#999' }}>保存后将用此密钥重新加密所有 Token</p>
        </div>
      </Modal>
    </>
  )
})
