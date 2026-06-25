import { ConfigProvider, App as AntdApp, Layout } from 'antd'
import zhCNAntd from 'antd/locale/zh_CN'
import enUSAntd from 'antd/locale/en_US'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TopNavBar, SettingsModal, PreviewModal, usePreview, KeyModals, type KeyModalsHandle } from './components'
import { CCLaunchItemPage } from './modules/cc-launch'
import { CXLaunchItemPage } from './modules/cx-launch'
import { OCLaunchItemPage } from './modules/oc-launch'
import { McpServersPage } from './modules/mcp-servers'
import { SystemSettingsPage } from './modules/system-settings/SystemSettingsPage'
import { ALL_SHELL_TYPES, SHELL_LABELS, SHELL_OS_SUPPORT, type ShellType } from '@shared/shell'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { extractIpcErrorMessage, isDecryptFailedError, isKeyNotFoundError } from './utils/ipc-error'
import { useTranslation } from 'react-i18next'
import './i18n'
import { useState, useEffect, useRef } from 'react'
import './App.css'

const { Content } = Layout

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

  const previewMenuItems = enabledShells.map((shell) => ({
    key: `preview-${shell}`,
    label: SHELL_LABELS[shell],
    onClick: () => handlePreview(shell),
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
        <TopNavBar
          onSettingsClick={() => setSettingsOpen(true)}
          onApplyClick={handleApply}
          previewMenuItems={previewMenuItems}
          copyMenuItems={copyMenuItems}
        />
        <Content className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to={settings?.defaultPage || '/system'} replace />} />
            <Route path="/system" element={<SystemSettingsPage />} />
            <Route path="/ccland" element={<CCLaunchItemPage />} />
            <Route path="/cxland" element={<CXLaunchItemPage />} />
            <Route path="/ocland" element={<OCLaunchItemPage />} />
            <Route path="/mcp" element={<McpServersPage />} />
          </Routes>
        </Content>
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
