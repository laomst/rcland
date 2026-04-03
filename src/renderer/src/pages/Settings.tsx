import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  Switch,
  Divider,
  Typography,
  Space,
  Select,
  message,
  Card
} from 'antd'
import { FolderOpenOutlined, KeyOutlined, ImportOutlined } from '@ant-design/icons'
import { SHELL_LABELS, type ShellType } from '@shared/shell'

const { Text, Title } = Typography

const SHELL_OPTIONS = Object.entries(SHELL_LABELS).map(([value, label]) => ({
  value,
  label
}))

export default function Settings(): React.ReactElement {
  const [shellType, setShellType] = useState<ShellType>('zsh')
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    window.electronAPI.keyExists().then(setHasKey).catch(() => {})
  }, [])

  const handleInitKey = async () => {
    await window.electronAPI.initKey()
    setHasKey(true)
    message.success('密钥已初始化')
  }

  const handleImport = () => {
    message.info('从现有配置文件导入功能将在 Phase 4 实现')
  }

  return (
    <div>
      <Title level={4} style={{ margin: 0 }}>设置</Title>
      <Text type="secondary">管理应用配置、密钥和 Shell 集成</Text>

      <Divider />

      <Card title="通用设置" style={{ marginBottom: 24 }}>
        <Form layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item label="配置目录" extra="可放在 iCloud/Dropbox 等同步目录中">
            <Space.Compact style={{ width: '100%' }}>
              <Input value="~/Library/Mobile Documents/ccland" />
              <Button icon={<FolderOpenOutlined />}>选择</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="密钥文件路径" extra="用于加密/解密敏感字段，不应放在同步目录中">
            <Space.Compact style={{ width: '100%' }}>
              <Input value="~/.ccland/keyfile.key" />
              <Button icon={<KeyOutlined />}>选择</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button disabled={hasKey} onClick={handleInitKey}>初始化密钥</Button>
              <Button disabled={!hasKey}>更换密钥</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Shell 设置" style={{ marginBottom: 24 }}>
        <Form layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item label="Shell 类型">
            <Select
              value={shellType}
              onChange={setShellType}
              options={SHELL_OPTIONS}
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item label="Shell 配置文件路径" extra={`当前: ${shellType === 'zsh' ? '~/.zshrc' : shellType === 'bash' ? '~/.bashrc' : shellType === 'powershell' ? '$PROFILE' : '~/.config/fish/config.fish'}`}>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={
                shellType === 'zsh' ? '~/.zshrc'
                  : shellType === 'bash' ? '~/.bashrc'
                    : shellType === 'powershell' ? '$PROFILE'
                      : '~/.config/fish/config.fish'
              } />
              <Button icon={<FolderOpenOutlined />}>选择</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="输出配置文件路径" extra={`如 ~/cctokenrc${shellType === 'powershell' ? '.ps1' : shellType === 'fish' ? '.fish' : shellType === 'bash' ? '.sh' : '.zsh'}`}>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={`~/cctokenrc${shellType === 'powershell' ? '.ps1' : shellType === 'fish' ? '.fish' : shellType === 'bash' ? '.sh' : '.zsh'}`} />
              <Button icon={<FolderOpenOutlined />}>选择</Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="自动 source 配置文件">
            <Switch checked={true} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="数据管理" style={{ marginBottom: 24 }}>
        <Space wrap>
          <Button icon={<ImportOutlined />} onClick={handleImport}>
            从现有配置文件导入
          </Button>
          <Button>全部加密</Button>
          <Button>全部解密</Button>
        </Space>
      </Card>
    </div>
  )
}
