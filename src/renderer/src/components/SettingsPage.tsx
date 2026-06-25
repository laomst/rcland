import { Modal, Input, Space, Button, Checkbox, Segmented } from 'antd'
import { App as AntdApp } from 'antd'
import { ArrowLeftOutlined, FolderOpenOutlined, KeyOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { ALL_SHELL_TYPES, SHELL_LABELS, SHELL_OS_SUPPORT, type ShellType } from '@shared/shell'
import { getAppPageLabels, type AppPage } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'

function getOsSupportedShells(): ShellType[] {
  const ua = navigator.userAgent.toLowerCase()
  let os: string
  if (ua.includes('win')) os = 'win32'
  else if (ua.includes('mac')) os = 'darwin'
  else os = 'linux'
  return SHELL_OS_SUPPORT[os] ?? ['zsh']
}

export interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps): React.ReactElement | null {
  const { message, modal } = AntdApp.useApp()
  const { t, i18n } = useTranslation()
  const osShells = getOsSupportedShells()

  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const keyExists = useSettingsStore((s) => s.keyExists)
  const refreshKeyExists = useSettingsStore((s) => s.refreshKeyExists)
  const openKeyModal = useSettingsStore((s) => s.openKeyModal)
  const loadData = useCCLaunchStore((s) => s.loadData)

  // Local drafts only for the two side-effecting fields (explicit apply)
  const [configDirDraft, setConfigDirDraft] = useState(() => settings?.configDir ?? '')
  const [keyPathDraft, setKeyPathDraft] = useState(() => settings?.keyFilePath ?? '')
  const [keyPathChangeState, setKeyPathChangeState] = useState<{ oldPath: string; newPath: string } | null>(null)

  useEffect(() => {
    refreshKeyExists()
  }, [refreshKeyExists])

  if (!settings) return null

  // ---- Immediate-save fields ----
  const changeLanguage = (value: 'zh-CN' | 'en') => {
    i18n.changeLanguage(value)
    updateSettings({ language: value })
  }

  const changeDefaultPage = (value: AppPage) => {
    updateSettings({ defaultPage: value })
  }

  const toggleShellEnabled = (shell: ShellType, enabled: boolean) => {
    updateSettings({
      shellProfiles: { ...settings.shellProfiles, [shell]: { enabled } }
    })
  }

  // ---- Explicit-apply fields ----
  const applyConfigDir = async () => {
    if (settings.configDir === configDirDraft) return
    await updateSettings({ configDir: configDirDraft })
    window.location.reload()
  }

  const applyKeyPath = async () => {
    const oldPath = settings.keyFilePath || ''
    const newPath = keyPathDraft
    if (oldPath === newPath) return

    const oldKeyExists = await window.electronAPI.keyExistsAtPath(oldPath)
    const newKeyExists = await window.electronAPI.keyExistsAtPath(newPath)
    if (oldKeyExists || newKeyExists) {
      setKeyPathChangeState({ oldPath, newPath })
      return
    }

    await updateSettings({ keyFilePath: newPath })
    await refreshKeyExists()
    message.success(t('settings.saved'))
  }

  const handleKeyPathMigration = async (mode: 'migrate' | 'reencrypt' | 'newKey') => {
    if (!keyPathChangeState) return
    const { oldPath, newPath } = keyPathChangeState

    try {
      if (mode === 'migrate') {
        await window.electronAPI.migrateKeyFile(oldPath, newPath)
        await updateSettings({ keyFilePath: newPath })
        message.success(t('settings.keyMigrated'))
      } else if (mode === 'reencrypt') {
        const result = await window.electronAPI.reencryptWithKeyPath(oldPath, newPath)
        await updateSettings({ keyFilePath: newPath })
        if (result.failedCount > 0) {
          message.warning(t('settings.reencryptPartial', { success: result.reencryptedCount, failed: result.failedCount }))
        } else {
          message.success(t('settings.reencryptSuccess', { success: result.reencryptedCount }))
        }
      } else if (mode === 'newKey') {
        await window.electronAPI.initKeyAtPath(newPath)
        await updateSettings({ keyFilePath: newPath })
        message.success(t('settings.newKeyInitialized'))
      }
      setKeyPathChangeState(null)
      await refreshKeyExists()
      await loadData(true)
    } catch (err) {
      message.error(t('settings.migrationFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
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
      onOk: () => openKeyModal('replace')
    })
  }

  const configDirChanged = settings.configDir !== configDirDraft
  const keyPathChanged = (settings.keyFilePath || '') !== keyPathDraft

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Button
          type="text"
          className="no-drag"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          aria-label={t('settings.back')}
        />
        <span className="settings-header-title">{t('settings.title')}</span>
      </div>

      <div className="settings-body">
        {/* 通用 */}
        <section className="settings-section">
          <h3 className="settings-section-title">{t('settings.sectionGeneral')}</h3>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.language')}</div>
            <div className="settings-item-desc">{t('settings.languageHint')}</div>
            <div className="settings-item-control">
              <Segmented
                value={settings.language || 'zh-CN'}
                onChange={(v) => changeLanguage(v as 'zh-CN' | 'en')}
                options={[
                  { label: '简体中文', value: 'zh-CN' },
                  { label: 'English', value: 'en' },
                ]}
              />
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.defaultPage')}</div>
            <div className="settings-item-desc">{t('settings.defaultPageHint')}</div>
            <div className="settings-item-control">
              <Segmented
                value={settings.defaultPage || '/system'}
                onChange={(v) => changeDefaultPage(v as AppPage)}
                options={Object.entries(getAppPageLabels(t)).map(([key, label]) => ({ value: key, label }))}
              />
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.shellSettings')}</div>
            <div className="settings-item-desc">{t('settings.shellSettingsHint')}</div>
            <div className="settings-item-control">
              <Space size={24} wrap>
                {ALL_SHELL_TYPES.map((shell) => {
                  const supported = osShells.includes(shell)
                  const profile = settings.shellProfiles[shell]
                  return (
                    <Checkbox
                      key={shell}
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
                  )
                })}
              </Space>
            </div>
          </div>
        </section>

        {/* 密钥与安全 */}
        <section className="settings-section">
          <h3 className="settings-section-title">{t('settings.sectionSecurity')}</h3>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.keyFilePath')}</div>
            <div className="settings-item-desc">{t('settings.keyFilePathHint')}</div>
            <div className="settings-item-control">
              <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
                <Input
                  value={keyPathDraft}
                  onChange={(e) => setKeyPathDraft(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<KeyOutlined />}
                  onClick={async () => {
                    const path = await window.electronAPI.showOpenDialog({
                      title: t('settings.selectKeyFile'),
                      defaultPath: keyPathDraft,
                      properties: ['openFile']
                    })
                    if (path) setKeyPathDraft(path)
                  }}
                />
                <Button type="primary" disabled={!keyPathChanged} onClick={applyKeyPath}>
                  {t('settings.apply')}
                </Button>
              </Space.Compact>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.keyManagement')}</div>
            <div className="settings-item-control">
              <Space>
                <Button disabled={keyExists} onClick={handleInitKey}>{t('settings.initKey')}</Button>
                <Button disabled={!keyExists} onClick={handleReplaceKey}>{t('settings.replaceKey')}</Button>
              </Space>
            </div>
          </div>
        </section>

        {/* 高级 */}
        <section className="settings-section">
          <h3 className="settings-section-title">{t('settings.sectionAdvanced')}</h3>

          <div className="settings-item">
            <div className="settings-item-title">{t('settings.configDir')}</div>
            <div className="settings-item-desc">{t('settings.configDirHint')}</div>
            <div className="settings-item-control">
              <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
                <Input
                  value={configDirDraft}
                  onChange={(e) => setConfigDirDraft(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={async () => {
                    const path = await window.electronAPI.showOpenDialog({
                      title: t('settings.selectConfigDir'),
                      defaultPath: configDirDraft,
                      properties: ['openDirectory']
                    })
                    if (path) setConfigDirDraft(path)
                  }}
                />
                <Button type="primary" disabled={!configDirChanged} onClick={applyConfigDir}>
                  {t('settings.applyAndRestart')}
                </Button>
              </Space.Compact>
            </div>
          </div>
        </section>
      </div>

      {/* Key Path Migration Modal (transient confirmation) */}
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
              <Button type="primary" block onClick={() => handleKeyPathMigration('migrate')}>
                {t('settings.migrateKeyFile')}
              </Button>
              <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
                {t('settings.migrateKeyFileDesc')}
              </div>

              <Button block onClick={() => handleKeyPathMigration('reencrypt')}>
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
    </div>
  )
}
