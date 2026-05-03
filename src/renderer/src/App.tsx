import { ConfigProvider, App as AntdApp, Layout, Button, Tooltip, Dropdown } from 'antd'
import zhCNAntd from 'antd/locale/zh_CN'
import enUSAntd from 'antd/locale/en_US'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EyeOutlined, ThunderboltOutlined, SettingOutlined, CopyOutlined } from '@ant-design/icons'
import { ModuleNav, SettingsModal, PreviewModal, usePreview, KeyModals, type KeyModalsHandle } from './components'
import { CCLaunchItemPage } from './modules/cc-launch'
import { CXLaunchItemPage } from './modules/cx-launch'
import { SystemProxyPage } from './modules/system-proxy'
import { EnvVarPage } from './modules/shell-env'
import { PathPage } from './modules/shell-path'
import { FunctionPage } from './modules/shell-functions'
import { AliasPage } from './modules/shell-aliases'
import { ALL_SHELL_TYPES, SHELL_LABELS, SHELL_OS_SUPPORT, type ShellType } from '@shared/shell'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { extractIpcErrorMessage, isDecryptFailedError, isKeyNotFoundError } from './utils/ipc-error'
import { useTranslation } from 'react-i18next'
import './i18n'
import { useState, useEffect, useRef } from 'react'
import './App.css'

const { Content, Footer, Sider } = Layout

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
  const { message } = AntdApp.useApp()
  const osShells = getOsSupportedShells()
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const refreshKeyExists = useSettingsStore((s) => s.refreshKeyExists)
  const openKeyModal = useSettingsStore((s) => s.openKeyModal)
  const { t, i18n } = useTranslation()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const keyModalsRef = useRef<KeyModalsHandle>(null)
  const { previewShell, previewContent, handlePreview, closePreview } = usePreview()

  useEffect(() => {
    loadSettings().then(() => {
      const lang = useSettingsStore.getState().settings?.language
      if (lang) i18n.changeLanguage(lang)
    })
    refreshKeyExists()
  }, [loadSettings, refreshKeyExists])

  // Derive enabled shells from settings
  const enabledShells = osShells.filter((s) => settings?.shellProfiles[s]?.enabled)

  const handleCopyScript = async (shell: ShellType) => {
    try {
      const content = await window.electronAPI.generateAllConfig(shell)
      await navigator.clipboard.writeText(content)
      message.success(t('app.copyScriptSuccess', { shell: SHELL_LABELS[shell] }))
    } catch (err) {
      message.error(t('app.copyScriptFailed', { error: extractIpcErrorMessage(err) }))
    }
  }

  const copyMenuItems = ALL_SHELL_TYPES.map((shell) => ({
    key: shell,
    label: SHELL_LABELS[shell],
    onClick: () => handleCopyScript(shell),
  }))

  const handleApply = async () => {
    if (enabledShells.length === 0) {
      message.warning(t('app.noShellEnabled'))
      return
    }
    await refreshKeyExists()
    const hasKey = useSettingsStore.getState().keyExists
    if (!hasKey) {
      openKeyModal('init')
      return
    }
    try {
      const result = await window.electronAPI.applyAllConfig(enabledShells)
      const shellNames = result.appliedShells.map((s) => SHELL_LABELS[s]).join(i18n.language === 'zh-CN' ? '、' : ', ')
      if (result.count > 0) {
        message.success(t('app.applySuccess', { shells: shellNames }))
      } else {
        message.warning(t('app.applyNone'))
      }
    } catch (err) {
      if (isDecryptFailedError(err)) {
        keyModalsRef.current?.openTempKeyModal()
      } else if (isKeyNotFoundError(err)) {
        openKeyModal('init')
      } else {
        message.error({ content: <>{t('app.applyFailed')}<br />{extractIpcErrorMessage(err)}</>, duration: 8 })
      }
    }
  }

  return (
    <>
      <Layout style={{ height: '100vh' }}>
        <Sider width={160} theme="dark">
          <div style={{ padding: '16px 0 8px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 16 }}>
            RCLand
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ModuleNav />
          </div>
          <div style={{ padding: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <SettingOutlined
              style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
              onClick={() => setSettingsOpen(true)}
            />
          </div>
        </Sider>
        <Layout>
          <Content className="content-area">
            <Routes>
              <Route path="/" element={settings ? <Navigate to={settings.defaultPage || '/env'} replace /> : null} />
              <Route path="/env" element={<EnvVarPage />} />
              <Route path="/path" element={<PathPage />} />
              <Route path="/functions" element={<FunctionPage />} />
              <Route path="/aliases" element={<AliasPage />} />
              <Route path="/system-proxy" element={<SystemProxyPage />} />
              <Route path="/ccland" element={<CCLaunchItemPage />} />
              <Route path="/cxland" element={<CXLaunchItemPage />} />
            </Routes>
          </Content>
          <Footer className="action-bar">
            <div className="action-bar-left" />
            <div className="action-bar-right">
              {enabledShells.map((shell) => (
                <Tooltip key={shell} title={t('app.previewShell', { shell: SHELL_LABELS[shell] })}>
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
              <Dropdown menu={{ items: copyMenuItems }} placement="topRight">
                <Button type="default" icon={<CopyOutlined />}>
                  {t('app.copyScript')}
                </Button>
              </Dropdown>
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleApply}>
                {t('app.apply')}
              </Button>
            </div>
          </Footer>
        </Layout>
      </Layout>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PreviewModal shell={previewShell} content={previewContent} onClose={closePreview} />
      <KeyModals ref={keyModalsRef} enabledShells={enabledShells} />
    </>
  )
}

export default function App(): React.ReactElement {
  const { i18n } = useTranslation()
  const antdLocale = i18n.language === 'zh-CN' ? zhCNAntd : enUSAntd

  return (
    <ConfigProvider locale={antdLocale}>
      <AntdApp>
        <HashRouter>
          <AppLayout />
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
