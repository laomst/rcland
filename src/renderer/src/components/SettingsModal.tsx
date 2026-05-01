import { Modal, Form, Input, Space, Button, Divider, Checkbox, Select } from 'antd'
import { App as AntdApp } from 'antd'
import { FolderOpenOutlined, KeyOutlined } from '@ant-design/icons'
import { useState, useCallback } from 'react'
import { ALL_SHELL_TYPES, SHELL_LABELS, SHELL_OS_SUPPORT, type ShellType } from '@shared/shell'
import { getAppPageLabels, type AppPage, type AppSettings } from '@shared/types'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
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
      await loadData(true)
      await loadShellConfig(true)
    }

    onClose()
    message.success(t('settings.saved'))
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
      title: t('settings.replaceKeyTitle'),
      content: (
        <div>
          <p>{t('settings.replaceKeyContent')}</p>
          <p style={{ fontSize: 12, color: '#999' }}>{t('settings.replaceKeyWarning')}</p>
        </div>
      ),
      okText: t('settings.continue'),
      cancelText: t('common.cancel'),
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
        message.success(t('settings.keyMigrated'))
      } else if (mode === 'reencrypt') {
        const result = await window.electronAPI.reencryptWithKeyPath(oldPath, newPath)
        await updateSettings(newSettings)
        if (result.failedCount > 0) {
          message.warning(t('settings.reencryptPartial', { success: result.reencryptedCount, failed: result.failedCount }))
        } else {
          message.success(t('settings.reencryptSuccess', { success: result.reencryptedCount }))
        }
      } else if (mode === 'newKey') {
        await window.electronAPI.initKeyAtPath(newPath)
        await updateSettings(newSettings)
        message.success(t('settings.newKeyInitialized'))
      }
      setKeyPathChangeState(null)
      onClose()
      await refreshKeyExists()
      await loadData(true)
    } catch (err) {
      message.error(t('settings.migrationFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <>
      <Modal
        title={t('settings.title')}
        open={open}
        onCancel={onClose}
        onOk={saveSettings}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
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
            <Divider>{t('settings.general')}</Divider>
            <Form.Item label={t('settings.configDir')} extra={t('settings.configDirHint')}>
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
                      title: t('settings.selectConfigDir'),
                      defaultPath: editSettings.configDir,
                      properties: ['openDirectory']
                    })
                    if (path) setEditSettings({ ...editSettings, configDir: path })
                  }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label={t('settings.keyFilePath')} extra={t('settings.keyFilePathHint')}>
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
                      title: t('settings.selectKeyFile'),
                      defaultPath: editSettings.keyFilePath,
                      properties: ['openFile']
                    })
                    if (path) setEditSettings({ ...editSettings, keyFilePath: path })
                  }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label={t('settings.keyManagement')}>
              <Space>
                <Button disabled={keyExists} onClick={handleInitKey}>{t('settings.initKey')}</Button>
                <Button disabled={!keyExists} onClick={handleReplaceKey}>{t('settings.replaceKey')}</Button>
              </Space>
            </Form.Item>
            <Form.Item label={t('settings.defaultPage')}>
              <Select
                value={editSettings.defaultPage || '/env'}
                onChange={(value: AppPage) => setEditSettings({ ...editSettings, defaultPage: value })}
                options={Object.entries(getAppPageLabels(t)).map(([key, label]) => ({ value: key, label }))}
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label={t('settings.language')}>
              <Select
                value={editSettings.language || 'zh-CN'}
                onChange={(value: 'zh-CN' | 'en') => {
                  setEditSettings({ ...editSettings, language: value })
                  i18n.changeLanguage(value)
                }}
                options={[
                  { label: '简体中文', value: 'zh-CN' },
                  { label: 'English', value: 'en' },
                ]}
                style={{ width: 200 }}
              />
            </Form.Item>

            <Divider>{t('settings.shellSettings')}</Divider>
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
                          {t('settings.notSupported')}
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
        title={t('settings.keyPathChanged')}
        open={!!keyPathChangeState}
        onCancel={() => setKeyPathChangeState(null)}
        footer={null}
        width={520}
      >
        {keyPathChangeState && (
          <div style={{ marginTop: 8 }}>
            <p>{t('settings.keyPathChangedDesc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <Button
                type="primary"
                block
                onClick={() => handleKeyPathMigration('migrate')}
              >
                {t('settings.migrateKeyFile')}
              </Button>
              <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
                {t('settings.migrateKeyFileDesc')}
              </div>

              <Button
                block
                onClick={() => handleKeyPathMigration('reencrypt')}
              >
                {t('settings.reencryptWithNewKey')}
              </Button>
              <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
                {t('settings.reencryptWithNewKeyDesc')}
              </div>

              <Button
                danger
                block
                onClick={() => {
                  modal.confirm({
                    title: t('settings.confirmInitNewKey'),
                    content: t('settings.confirmInitNewKeyContent'),
                    okText: t('common.confirm'),
                    okType: 'danger',
                    cancelText: t('common.cancel'),
                    onOk: () => handleKeyPathMigration('newKey')
                  })
                }}
              >
                {t('settings.initNewKey')}
              </Button>
              <div style={{ fontSize: 12, color: '#999', marginTop: -8 }}>
                {t('settings.initNewKeyDesc')}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
