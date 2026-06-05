import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ApiOutlined,
  ControlOutlined,
  ForkOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { FunctionBoldIcon, ClaudeCodeIcon, CodexIcon, OpenCodeIcon } from './LauncherIcons'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useTranslation } from 'react-i18next'

export function ModuleNav(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSettingsStore((s) => s.settings)

  const menuItems = [
    { key: '/system-proxy', label: t('nav.systemProxy'), icon: <ApiOutlined /> },
    { key: '/env', label: t('nav.env'), icon: <ControlOutlined /> },
    { key: '/path', label: t('nav.path'), icon: <ForkOutlined /> },
    { key: '/functions', label: t('nav.functions'), icon: <FunctionBoldIcon /> },
    { key: '/aliases', label: t('nav.aliases'), icon: <LinkOutlined /> },
    { type: 'divider' as const },
    { key: '/ccland', label: t('nav.ccland'), icon: <ClaudeCodeIcon /> },
    { key: '/cxland', label: t('nav.cxland'), icon: <CodexIcon /> },
    { key: '/ocland', label: t('nav.ocland'), icon: <OpenCodeIcon /> }
  ]
  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname === '/' ? (settings?.defaultPage || '/env') : location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ borderRight: 0 }}
    />
  )
}
