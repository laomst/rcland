import { Modal, Form, Input, Space, Button, Divider, Checkbox, Select } from 'antd'
import { App as AntdApp } from 'antd'
import { FolderOpenOutlined, KeyOutlined } from '@ant-design/icons'
import { useState, useCallback } from 'react'
import { ALL_SHELL_TYPES, SHELL_LABELS, SHELL_OS_SUPPORT, type ShellType } from '@shared/shell'
import { APP_PAGE_LABELS, type AppPage, type AppSettings } from '@shared/types'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useShellConfigStore } from '@renderer/stores/useShellConfigStore'

function getOsSupportedShells(): ShellType[] {
  const ua = navigator.userAgent.toLowerCase()
  let os: string
  if (ua.includes('win')) os = 'win32'
  else if (ua.includes('mac')) os = 'darwin'
  else os = 'linux'
  return SHELL_OS_SUPPORT[os] ?? ['zsh']
}

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement {
  const { message, modal } = AntdApp.useApp()
  const osShells = getOsSupportedShells()

  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const keyExists = useSettingsStore((s) => s.keyExists)
  const refreshKeyExists = useSettingsStore((s) => s.refreshKeyExists)
  const openKeyModal = useSettingsStore((s) => s.openKeyModal)
  const loadData = useAppStore((s) => s.loadData)
  const loadShellConfig = useShellConfigStore((s) => s.loadShellConfig)

  const [editSettings, setEditSettings] = useState<AppSettings | null>(null)
  const [keyPathChangeState, setKeyPathChangeState] = useState<{
    oldPath: string
    newPath: string
    editSettings: AppSettings
  } | null>(null)

  // Sync local editSettings when modal opens
  const handleOpen = useCallback(() => {
    refreshKeyExists()
    if (settings) {
      setEditSettings({ ...settings, shellProfiles: { ...settings.shellProfiles } })
    }
  }, [settings, refreshKeyExists])

  const saveSettings = async () => {
    if (!editSettings) return

    if (settings?.keyFilePath !== editSettings.keyFilePath) {
      const oldPath = settings?.keyFilePath || ''
      const newPath = editSettings.keyFilePath

      const oldKeyExists = await window.electronAPI.keyExistsAtPath(oldPath)
      const newKeyExists = await window.electronAPI.keyExistsAtPath(newPath)

      if (oldKeyExists) {
        setKeyPathChangeState({ oldPath, newPath, editSettings: { ...editSettings } })
        return
      } else if (newKeyExists) {
        setKeyPathChangeState({ oldPath, newPath, editSettings: { ...editSettings } })
        return
      }
    }

    const configDirChanged = settings?.configDir !== editSettings.configDir
    await updateSettings(editSettings)

    if (configDirChanged) {
      await loadData()
      await loadShellConfig()
    }

    onClose()
    message.success('设置已保存')
  }

  const toggleShellEnabled = (shell: ShellType, enabled: boolean) => {
    if (!editSettings) return
    setEditSettings({
      ...editSettings,
      shellProfiles: {
        ...editSettings.shellProfiles,
        [shell]: { enabled }
      }
    })
  }

  const handleInitKey = () => {
    openKeyModal('init')
  }

  const handleReplaceKey = () => {
    modal.confirm({
      title: '更换密钥',
      content: (
        <div>
          <p>更换密钥将会使用新密钥重新加密所有已保存的 Token。</p>
          <p style={{ fontSize: 12, color: '#999' }}>此操作不可撤销，请确保您记住新密钥。</p>
        </div>
      ),
      okText: '继续',
      cancelText: '取消',
      onOk: () => {
        openKeyModal('replace')
      }
    })
  }

  const handleKeyPathMigration = async (mode: 'migrate' | 'reencrypt' | 'newKey') => {
    if (!keyPathChangeState) return
    const { oldPath, newPath, editSettings: newSettings } = keyPathChangeState

    try {
      if (mode === 'migrate') {
        await window.electronAPI.migrateKeyFile(oldPath, newPath)
        await updateSettings(newSettings)
        message.success('密钥文件已迁移到新位置')
      } else if (mode === 'reencrypt') {
        const result = await window.electronAPI.reencryptWithKeyPath(oldPath, newPath)
        await updateSettings(newSettings)
        if (result.failedCount > 0) {
          message.warning(`数据迁移完成，${result.reencryptedCount} 个 Token 已重新加密，${result.failedCount} 个失败`)
        } else {
          message.success(`数据迁移完成，${result.reencryptedCount} 个 Token 已重新加密`)
        }
      } else if (mode === 'newKey') {
        await window.electronAPI.initKey(undefined)
        await updateSettings(newSettings)
        message.success('已在新位置初始化新密钥（旧数据将无法解密）')
      }
      setKeyPathChangeState(null)
      onClose()
      await refreshKeyExists()
      await loadData()
    } catch (err) {
      message.error(`迁移失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <>
      <Modal
        title="基础设置"
        open={open}
        onCancel={onClose}
        onOk={saveSettings}
        okText="保存"
        cancelText="取消"
        width={680}
        afterOpenChange={(visible) => { if (visible) handleOpen() }}
      >
        {editSettings && (
          <Form
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            labelAlign="left"
            colon={false}
            style={{ marginTop: 16 }}
          >
            <Divider>通用设置</Divider>
            <Form.Item label="配置目录" extra="可放在 iCloud/Dropbox 等同步目录中">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={editSettings.configDir}
                  onChange={(e) => setEditSettings({ ...editSettings, configDir: e.target.value })}
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={async () => {
                    const path = await window.electronAPI.showOpenDialog({
                      title: '选择配置目录',
                      defaultPath: editSettings.configDir,
                      properties: ['openDirectory']
                    })
                    if (path) setEditSettings({ ...editSettings, configDir: path })
                  }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="密钥文件路径" extra="用于加密/解密 Token，不应放在同步目录中">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={editSettings.keyFilePath}
                  onChange={(e) => setEditSettings({ ...editSettings, keyFilePath: e.target.value })}
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<KeyOutlined />}
                  onClick={async () => {
                    const path = await window.electronAPI.showOpenDialog({
                      title: '选择密钥文件',
                      defaultPath: editSettings.keyFilePath,
                      properties: ['openFile']
                    })
                    if (path) setEditSettings({ ...editSettings, keyFilePath: path })
                  }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="密钥管理">
              <Space>
                <Button disabled={keyExists} onClick={handleInitKey}>初始化密钥</Button>
                <Button disabled={!keyExists} onClick={handleReplaceKey}>更换密钥</Button>
              </Space>
            </Form.Item>
            <Form.Item label="默认首页">
              <Select
                value={editSettings.defaultPage || '/env'}
                onChange={(value: AppPage) => setEditSettings({ ...editSettings, defaultPage: value })}
                options={Object.entries(APP_PAGE_LABELS).map(([key, label]) => ({ value: key, label }))}
                style={{ width: 200 }}
              />
            </Form.Item>

            <Divider>Shell 设置</Divider>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {ALL_SHELL_TYPES.map((shell) => {
                const supported = osShells.includes(shell)
                const profile = editSettings.shellProfiles[shell]
                return (
                  <div key={shell} style={{ opacity: supported ? 1 : 0.4 }}>
                    <Checkbox
                      checked={!!profile?.enabled}
                      disabled={!supported}
                      onChange={(e) => toggleShellEnabled(shell, e.target.checked)}
                    >
                      {SHELL_LABELS[shell]}
                      {!supported && (
                        <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>
                          (当前系统不支持)
                        </span>
                      )}
                    </Checkbox>
                  </div>
                )
              })}
            </div>
          </Form>
        )}
      </Modal>

      {/* Key Path Migration Modal */}
      <Modal
        title="密钥文件路径已更改"
        open={!!keyPathChangeState}
        onCancel={() => setKeyPathChangeState(null)}
        footer={null}
        width={520}
      >
        {keyPathChangeState && (
          <div style={{ marginTop: 8 }}>
            <p>检测到密钥文件路径已更改，请选择处理方式：</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <Button
                type="primary"
                block
                onClick={() => handleKeyPathMigration('migrate')}
              >
                迁移密钥文件
              </Button>
              <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
                将旧位置的密钥文件复制到新位置，保留现有加密数据
              </div>

              <Button
                block
                onClick={() => handleKeyPathMigration('reencrypt')}
              >
                使用新位置的密钥重新加密
              </Button>
              <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
                新位置已有密钥，用它重新加密所有 Token
              </div>

              <Button
                danger
                block
                onClick={() => {
                  modal.confirm({
                    title: '确认初始化新密钥',
                    content: '这将生成新的随机密钥，所有现有 Token 将无法解密！',
                    okText: '确认',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => handleKeyPathMigration('newKey')
                  })
                }}
              >
                初始化新密钥（丢弃旧数据）
              </Button>
              <div style={{ fontSize: 12, color: '#999', marginTop: -8 }}>
                在新位置生成新密钥，旧数据将无法解密
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
