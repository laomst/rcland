// src/renderer/src/components/TopNavBar.tsx
import { Button, Tooltip, Dropdown } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  SettingOutlined,
  ControlOutlined,
  ToolOutlined,
  EyeOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { ClaudeCodeIcon, CodexIcon, OpenCodeIcon } from './LauncherIcons'
import { useTranslation } from 'react-i18next'

interface NavTab {
  key: string
  label: string
  icon: React.ReactNode
}

interface TopNavBarProps {
  onSettingsClick: () => void
  onApplyClick: () => void
  previewMenuItems: { key: string; label: string; onClick: () => void }[]
  copyMenuItems: { key: string; label: string; onClick: () => void }[]
}

export function TopNavBar({
  onSettingsClick,
  onApplyClick,
  previewMenuItems,
  copyMenuItems,
}: TopNavBarProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const tabs: NavTab[] = [
    { key: '/system', label: t('nav.system'), icon: <ControlOutlined /> },
    { key: '/ccland', label: t('nav.ccland'), icon: <ClaudeCodeIcon /> },
    { key: '/cxland', label: t('nav.cxland'), icon: <CodexIcon /> },
    { key: '/ocland', label: t('nav.ocland'), icon: <OpenCodeIcon /> },
  ]

  const currentPath = location.pathname === '/' ? '/system' : location.pathname
  const isMcpActive = currentPath === '/mcp'

  return (
    <div className="top-nav-bar">
      {/* 左区: 设置 */}
      <div className="top-nav-left no-drag">
        <SettingOutlined className="top-nav-settings-icon" onClick={onSettingsClick} />
      </div>

      {/* 标签页按钮组 + 工具图标组，靠右排列 */}
      <div className="top-nav-tabs-and-tools no-drag">
      <div className="top-nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`top-nav-tab ${currentPath === tab.key ? 'active' : ''}`}
            onClick={() => navigate(tab.key)}
          >
            <span className="top-nav-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 工具图标组 */}
      <div className="top-nav-right">
        <Tooltip title={t('nav.mcp')}>
          <Button
            type="text"
            size="small"
            icon={<ToolOutlined />}
            className={isMcpActive ? 'top-nav-tool-active' : ''}
            onClick={() => navigate('/mcp')}
          />
        </Tooltip>
        <Dropdown menu={{ items: previewMenuItems }} placement="bottomRight">
          <Button type="text" size="small" icon={<EyeOutlined />} />
        </Dropdown>
        <Dropdown menu={{ items: copyMenuItems }} placement="bottomRight">
          <Button type="text" size="small" icon={<CopyOutlined />} />
        </Dropdown>
        <Tooltip title={t('app.apply')}>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onApplyClick}
          />
        </Tooltip>
      </div>
      </div>
    </div>
  )
}
