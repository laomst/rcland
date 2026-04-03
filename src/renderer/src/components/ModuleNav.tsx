import { Menu } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const menuItems = [
  { key: '/cc-config', label: '配置管理', icon: <ApiOutlined /> }
]

export function ModuleNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ borderRight: 0 }}
    />
  )
}
