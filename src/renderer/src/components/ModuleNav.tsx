import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppstoreOutlined,
  NodeIndexOutlined,
  FunctionOutlined,
  FileTextOutlined,
  ApiOutlined
} from '@ant-design/icons'

const menuItems = [
  { key: '/env', label: '环境变量', icon: <AppstoreOutlined /> },
  { key: '/path', label: 'PATH', icon: <NodeIndexOutlined /> },
  { key: '/functions', label: '函数', icon: <FunctionOutlined /> },
  { key: '/aliases', label: '别名', icon: <FileTextOutlined /> },
  { type: 'divider' as const },
  { key: '/ccland', label: 'CCLand', icon: <ApiOutlined /> }
]
export function ModuleNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname === '/' ? '/env' : location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ borderRight: 0 }}
    />
  )
}
