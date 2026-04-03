import { ConfigProvider, App as AntdApp, Layout, Button, Space, Modal, Form, Input, Switch, Divider, Checkbox, Tooltip, Typography } from 'antd'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { EyeOutlined, ThunderboltOutlined, SettingOutlined, FolderOpenOutlined, KeyOutlined } from '@ant-design/icons'
import { TempKeyModal } from './components/TempKeyModal'
import CCConfigPage from './modules/cc-launch/pages/CCConfigPage'
import { SHELL_LABELS, SHELL_OS_SUPPORT, SHELL_DEFAULTS, ALL_SHELL_TYPES, type ShellType, type ShellProfileConfig } from '@shared/shell'
import type { AppSettings } from '@shared/types'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useState, useEffect, useCallback } from 'react'
import './App.css'

const { Content, Footer } = Layout

/** Shells available on current OS (renderer runs on same OS) */
function getOsSupportedShells(): ShellType[] {
  const ua = navigator.userAgent.toLowerCase()
  let os: string
  if (ua.includes('win')) os = 'win32'
  else if (ua.includes('mac')) os = 'darwin'
  else os = 'linux'
  return SHELL_OS_SUPPORT[os] ?? ['zsh']
}

function AppLayout(): React.ReactElement {
  const { message, modal } = AntdApp.useApp()
  const osShells = getOsSupportedShells()
  const settings = useAppStore((s) => s.settings)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const loadData = useAppStore((s) => s.loadData)

  const [previewShell, setPreviewShell] = useState<ShellType | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [tempKeyModalOpen, setTempKeyModalOpen] = useState(false)
  const [lastSuccessfulTempKey, setLastSuccessfulTempKey] = useState('')
  const [saveKeyConfirmOpen, setSaveKeyConfirmOpen] = useState(false)
  const [keyPathChangeState, setKeyPathChangeState] = useState<{
    oldPath: string
    newPath: string
    editSettings: AppSettings
  } | null>(null)

  const keyExists = useAppStore((s) => s.keyExists)
  const keyModalOpen = useAppStore((s) => s.keyModalOpen)
  const keyModalMode = useAppStore((s) => s.keyModalMode)
  const refreshKeyExists = useAppStore((s) => s.refreshKeyExists)
  const openKeyModal = useAppStore((s) => s.openKeyModal)
  const closeKeyModal = useAppStore((s) => s.closeKeyModal)

  useEffect(() => {
    loadSettings()
    refreshKeyExists()
  }, [loadSettings, refreshKeyExists])

  // Derive enabled shells from settings
  const enabledShells = osShells.filter((s) => settings?.shellProfiles[s]?.enabled)

  // Local state for settings edit form
  const [editSettings, setEditSettings] = useState<AppSettings | null>(null)

  const openSettings = useCallback(() => {
    refreshKeyExists()
    if (settings) {
      setEditSettings({ ...settings, shellProfiles: { ...settings.shellProfiles } })
    }
    setSettingsOpen(true)
  }, [settings, refreshKeyExists])

  const saveSettings = async () => {
    if (!editSettings) return

    // Check if keyFilePath changed
    if (settings?.keyFilePath !== editSettings.keyFilePath) {
      const oldPath = settings?.keyFilePath || ''
      const newPath = editSettings.keyFilePath

      // Check if old key exists
      const oldKeyExists = await window.electronAPI.keyExistsAtPath(oldPath)
      const newKeyExists = await window.electronAPI.keyExistsAtPath(newPath)

      if (oldKeyExists) {
        // Show migration options
        setKeyPathChangeState({ oldPath, newPath, editSettings: { ...editSettings } })
        return
      } else if (newKeyExists) {
        // New path has a key, need to re-encrypt data
        setKeyPathChangeState({ oldPath, newPath, editSettings: { ...editSettings } })
        return
      }
      // Neither path has a key, just save
    }

    const configDirChanged = settings?.configDir !== editSettings.configDir
    await updateSettings(editSettings)

    // Reload data if configDir changed
    if (configDirChanged) {
      await loadData()
    }

    setSettingsOpen(false)
    message.success('设置已保存')
  }

  const handlePreview = async (shell: ShellType) => {
    setPreviewShell(shell)
    setPreviewContent('加载中...')
    try {
      const content = await window.electronAPI.generateConfig(shell)
      setPreviewContent(content)
    } catch (err) {
      setPreviewContent(`生成失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleApply = async () => {
    if (enabledShells.length === 0) {
      message.warning('请先在设置中启用至少一个 Shell')
      return
    }
    // 先刷新密钥状态，然后获取最新值
    await refreshKeyExists()
    const hasKey = useAppStore.getState().keyExists
    if (!hasKey) {
      openKeyModal('init')
      return
    }
    try {
      const result = await window.electronAPI.applyConfig(enabledShells)
      const shellNames = result.appliedShells.map((s) => SHELL_LABELS[s]).join('、')
      if (result.count > 0) {
        message.success(`已应用配置到: ${shellNames}`)
      } else {
        message.warning('没有应用任何 Shell 配置')
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('DECRYPT_FAILED')) {
        setTempKeyModalOpen(true)
      } else if (errMsg.includes('Key file not found')) {
        openKeyModal('init')
      } else {
        message.error(`应用失败: ${errMsg}`)
      }
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

  const handleInitKey = () => {
    openKeyModal('init')
  }

  const handleReplaceKey = () => {
    // Show confirmation first
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

  // Handle key path change migration
  const handleKeyPathMigration = async (mode: 'migrate' | 'reencrypt' | 'newKey') => {
    if (!keyPathChangeState) return
    const { oldPath, newPath, editSettings: newSettings } = keyPathChangeState

    try {
      if (mode === 'migrate') {
        // Move key file to new location
        await window.electronAPI.migrateKeyFile(oldPath, newPath)
        await updateSettings(newSettings)
        message.success('密钥文件已迁移到新位置')
      } else if (mode === 'reencrypt') {
        // Use new key to re-encrypt all data
        const result = await window.electronAPI.reencryptWithKeyPath(oldPath, newPath)
        await updateSettings(newSettings)
        if (result.failedCount > 0) {
          message.warning(`数据迁移完成，${result.reencryptedCount} 个 Token 已重新加密，${result.failedCount} 个失败`)
        } else {
          message.success(`数据迁移完成，${result.reencryptedCount} 个 Token 已重新加密`)
        }
      } else if (mode === 'newKey') {
        // Generate new key at new path (data will not be readable)
        await window.electronAPI.initKey(keyInput || undefined)
        await updateSettings(newSettings)
        message.success('已在新位置初始化新密钥（旧数据将无法解密）')
      }
      setKeyPathChangeState(null)
      setSettingsOpen(false)
      await refreshKeyExists()
      await loadData()
    } catch (err) {
      message.error(`迁移失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const updateShellProfile = (shell: ShellType, patch: Partial<ShellProfileConfig>) => {
    if (!editSettings) return
    setEditSettings({
      ...editSettings,
      shellProfiles: {
        ...editSettings.shellProfiles,
        [shell]: { ...(editSettings.shellProfiles[shell] ?? SHELL_DEFAULTS[shell] as any), ...patch }
      }
    })
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout>
        <Content className="content-area">
          <Routes>
            <Route path="/" element={<CCConfigPage />} />
            <Route path="/cc-config" element={<CCConfigPage />} />
          </Routes>
        </Content>
        <Footer className="action-bar">
          <div className="action-bar-left">
            <SettingOutlined
              style={{ fontSize: 16, color: '#666', cursor: 'pointer' }}
              onClick={openSettings}
            />
          </div>
          <div className="action-bar-right">
            {enabledShells.map((shell) => (
              <Tooltip key={shell} title={`预览 ${SHELL_LABELS[shell]} 配置`}>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(shell)}
                >
                  {SHELL_LABELS[shell]}
                </Button>
              </Tooltip>
            ))}
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleApply}>
              应用
            </Button>
          </div>
        </Footer>
      </Layout>

      {/* Preview Modal */}
      <Modal
        title={previewShell ? `配置预览 — ${SHELL_LABELS[previewShell]}` : '配置预览'}
        open={previewShell !== null}
        onCancel={() => setPreviewShell(null)}
        width={720}
        footer={null}
      >
        <pre style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: 16,
          borderRadius: 6,
          fontSize: 13,
          maxHeight: 480,
          overflow: 'auto'
        }}>
          {previewContent}
        </pre>
      </Modal>

      {/* Settings Modal */}
      <Modal
        title="基础设置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={saveSettings}
        okText="保存"
        cancelText="取消"
        width={680}
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

            <Divider>Shell 设置</Divider>
            {ALL_SHELL_TYPES.map((shell) => {
              const supported = osShells.includes(shell)
              const profile = editSettings.shellProfiles[shell]
              return (
                <div key={shell} style={{ opacity: supported ? 1 : 0.4, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <Checkbox
                      checked={!!profile?.enabled}
                      disabled={!supported}
                      onChange={(e) => {
                        if (profile) {
                          updateShellProfile(shell, { enabled: e.target.checked })
                        } else if (e.target.checked) {
                          updateShellProfile(shell, {
                            enabled: true,
                            profilePath: SHELL_DEFAULTS[shell].profilePath,
                            outputPath: `~/cctokenrc${SHELL_DEFAULTS[shell].outputFileExt}`,
                            autoSource: true
                          })
                        }
                      }}
                    />
                    <span style={{ fontWeight: 500, marginLeft: 6 }}>{SHELL_LABELS[shell]}</span>
                    {!supported && (
                      <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                        (当前系统不支持)
                      </span>
                    )}
                  </div>
                  {profile && (
                    <div style={{ paddingLeft: 28 }}>
                      <Form.Item label="配置文件路径" style={{ marginBottom: 8 }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            value={profile.profilePath}
                            onChange={(e) => updateShellProfile(shell, { profilePath: e.target.value })}
                            style={{ fontFamily: 'monospace' }}
                          />
                          <Button
                            icon={<FolderOpenOutlined />}
                            onClick={async () => {
                              const path = await window.electronAPI.showOpenDialog({
                                title: '选择配置文件',
                                defaultPath: profile.profilePath,
                                properties: ['openFile']
                              })
                              if (path) updateShellProfile(shell, { profilePath: path })
                            }}
                          />
                        </Space.Compact>
                      </Form.Item>
                      <Form.Item label="输出文件路径" style={{ marginBottom: 8 }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            value={profile.outputPath}
                            onChange={(e) => updateShellProfile(shell, { outputPath: e.target.value })}
                            style={{ fontFamily: 'monospace' }}
                          />
                          <Button
                            icon={<FolderOpenOutlined />}
                            onClick={async () => {
                              const path = await window.electronAPI.showOpenDialog({
                                title: '选择输出文件路径',
                                defaultPath: profile.outputPath,
                                properties: ['openFile', 'createDirectory']
                              })
                              if (path) updateShellProfile(shell, { outputPath: path })
                            }}
                          />
                        </Space.Compact>
                      </Form.Item>
                      <Form.Item label="自动 source" style={{ marginBottom: 0 }}>
                        <Switch
                          checked={profile.autoSource}
                          onChange={(checked) => updateShellProfile(shell, { autoSource: checked })}
                        />
                      </Form.Item>
                    </div>
                  )}
                </div>
              )
            })}
          </Form>
        )}
      </Modal>

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
    </Layout>
  )
}

export default function App(): React.ReactElement {
  return (
    <ConfigProvider>
      <AntdApp>
        <HashRouter>
          <AppLayout />
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
