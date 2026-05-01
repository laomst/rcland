import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppstoreOutlined,
  NodeIndexOutlined,
  FunctionOutlined,
  TagsOutlined,
  CodeSandboxOutlined,
  RobotOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useTranslation } from 'react-i18next'

export function ModuleNav(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSettingsStore((s) => s.settings)

  const menuItems = [
    { key: '/system-proxy', label: t('nav.systemProxy'), icon: <GlobalOutlined /> },
    { key: '/env', label: t('nav.env'), icon: <AppstoreOutlined /> },
    { key: '/path', label: t('nav.path'), icon: <NodeIndexOutlined /> },
    { key: '/functions', label: t('nav.functions'), icon: <FunctionOutlined /> },
    { key: '/aliases', label: t('nav.aliases'), icon: <TagsOutlined /> },
    { type: 'divider' as const },
    { key: '/ccland', label: t('nav.ccland'), icon: <CodeSandboxOutlined /> },
    { key: '/cxland', label: t('nav.cxland'), icon: <RobotOutlined /> }
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
