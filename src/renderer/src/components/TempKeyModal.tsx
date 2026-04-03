import { useState, useCallback, useEffect, memo } from 'react'
import { Modal, Input, App } from 'antd'
import { SHELL_LABELS, type ShellType } from '@shared/shell'

interface TempKeyModalProps {
  open: boolean
  enabledShells: ShellType[]
  onSuccess: (key: string) => void
  onClose: () => void
}

function TempKeyModalComponent({ open, enabledShells, onSuccess, onClose }: TempKeyModalProps) {
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
      message.warning('请输入密钥')
      triggerShake()
      return
    }
    setLoading(true)
    try {
      const result = await window.electronAPI.tryApplyWithKey(enabledShells, tempKeyValue)
      if (result && result.success) {
        const shellNames = (result.appliedShells ?? []).map((s) => SHELL_LABELS[s]).join('、')
        if (result.count && result.count > 0) {
          message.success(`已应用配置到: ${shellNames}`)
        } else {
          message.warning('没有应用任何 Shell 配置')
        }
        onSuccess(tempKeyValue)
      } else if (result && result.error === 'DECRYPT_FAILED') {
        message.error('密钥不正确，无法解密所有 Token')
        triggerShake()
      } else {
        message.error(`应用失败: ${result?.error || '未知错误'}`)
        triggerShake()
      }
    } catch (err) {
      message.error(`应用失败: ${err instanceof Error ? err.message : String(err)}`)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }, [tempKeyValue, enabledShells, onSuccess, triggerShake])

  return (
    <Modal
      title="解密失败"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="使用临时密钥重试"
      cancelText="取消"
      width={480}
    >
      <div className={shake ? 'shake-animation' : ''} style={{ marginTop: 8 }}>
        <p>当前密钥无法解密部分 Token，可能是密钥已更换。请输入正确的密钥：</p>
        <Input.Password
          value={tempKeyValue}
          onChange={(e) => setTempKeyValue(e.target.value)}
          placeholder="输入密钥"
          status={shake ? 'error' : undefined}
          style={{ marginBottom: 8 }}
          autoFocus
        />
        <div style={{ fontSize: 12, color: '#999' }}>
          此密钥仅临时使用，成功后可选择保存为默认密钥
        </div>
      </div>
    </Modal>
  )
}

export const TempKeyModal = memo(TempKeyModalComponent)
